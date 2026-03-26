import os
import re
import random
from datetime import date, timedelta, time, datetime
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
from accounts.models import (
    Delivery,
    Payment,
    Route,
    User,
)

# PAYMENT_METHODS defined below

fake = Faker('en_PK')

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────
NUM_OWNERS           = 5
DRIVERS_PER_OWNER    = 4
CUSTOMERS_PER_OWNER  = 20
CUSTOMERS_PER_DRIVER = 5
MONTHS_OF_DATA       = 6
PASSWORD             = "Test@1234"

PAYMENT_METHODS = ["Cash", "JazzCash", "EasyPaisa", "Bank Transfer"]


# ─────────────────────────────────────────────
# Unique phone number generator
# ─────────────────────────────────────────────
class PhonePool:
    PREFIXES = [
        "0300", "0301", "0302", "0303", "0304", "0305",
        "0310", "0311", "0312", "0313", "0314", "0315",
        "0320", "0321", "0322", "0323", "0324", "0325",
        "0330", "0331", "0332", "0333", "0334", "0335",
        "0340", "0341", "0342", "0343", "0344", "0345",
    ]

    def __init__(self):
        self._used = set()

    def get(self) -> str:
        while True:
            number = random.choice(self.PREFIXES) + str(random.randint(1000000, 9999999))
            if number not in self._used:
                self._used.add(number)
                return number


phone_pool = PhonePool()


class Command(BaseCommand):
    help = "Seed the Rasad database with realistic fake data for testing."

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.MIGRATE_HEADING("\n🌱  Starting Rasad seed...\n"))

        if User.objects.filter(role="owner").exists():
            self.stdout.write(self.style.WARNING(
                "⚠️  Owner accounts already exist. "
                "Refreshing their data to ensure ideal math consistency...\n"
            ))
            # No return here, let it proceed to _seed_owner which should handle updates/re-seeding

        self._credentials = []

        for i in range(1, NUM_OWNERS + 1):
            self._seed_owner(i)

        self._write_credentials_file()

        self.stdout.write(self.style.SUCCESS("\n✅  Seeding complete!\n"))
        self.stdout.write(self.style.SUCCESS(
            "📄  Credentials saved → rasad_credentials.txt  (same folder as manage.py)\n"
        ))

    # ── owner ─────────────────────────────────────────────────────────────────
    def _seed_owner(self, index: int):
        # dairy_name must be alphabets + spaces only (model validator)
        dairy_name = re.sub(r'[^a-zA-Z\s]', '', fake.company()).strip() + " Dairy"
        phone      = phone_pool.get()

        owner, created = User.objects.get_or_create(
            username=f"owner{index}",
            defaults={
                "password": make_password(PASSWORD),
                "role": "owner",
                "is_active": True,
            }
        )
        
        # Always update these fields to ensure consistency
        owner.first_name = fake.first_name()
        owner.last_name = fake.last_name()
        owner.email = f"owner{index}@rasad.test"
        owner.dairy_name = dairy_name
        owner.phone_number = phone
        owner.buffalo_price = Decimal(str(random.randint(180, 250)))
        owner.cow_price = Decimal(str(random.randint(140, 200)))
        owner.house_no = fake.building_number()
        owner.street = fake.street_name()
        owner.area = fake.neighborhood()
        owner.city = "Peshawar"
        owner.latitude = Decimal("34.0151")
        owner.longitude = Decimal("71.5249")
        owner.total_paid = Decimal("0.00")
        owner.outstanding_balance = Decimal("0.00")
        owner.save()

        self._credentials.append({
            "role": "OWNER", "name": dairy_name,
            "phone": phone, "password": PASSWORD, "under_owner": "—",
        })

        self.stdout.write(f"  👤 Owner [{index}/{NUM_OWNERS}]: {phone}  ({dairy_name})")

        routes    = self._seed_routes(owner)
        drivers   = self._seed_drivers(owner, routes)
        customers = self._seed_customers(owner, routes, drivers)
        self._seed_history(owner, customers)

    # ── routes ────────────────────────────────────────────────────────────────
    def _seed_routes(self, owner: User) -> list:
        routes = []
        for name in ["Gulbahar", "Saddar", "Hayatabad", "Cantt"]:
            Route.objects.update_or_create(
                name=f"{name} - {owner.dairy_name}",
                owner=owner,
                defaults={"description": fake.sentence()}
            )
        return list(Route.objects.filter(owner=owner))

    # ── drivers ───────────────────────────────────────────────────────────────
    def _seed_drivers(self, owner: User, routes: list) -> list:
        drivers = []
        for i, route in enumerate(routes):
            phone  = phone_pool.get()
            driver = User.objects.create(
                # --- AbstractUser required fields ---
                username       = f"driver_{owner.id}_{i + 1}",
                password       = make_password(PASSWORD),
                first_name     = fake.first_name(),
                last_name      = fake.last_name(),
                email          = fake.unique.email(),
                is_active      = True,

                # --- Role & ownership ---
                role            = "driver",
                parent_owner    = owner,

                # --- Driver-specific fields ---
                phone_number    = phone,
                license_number  = f"LIC-{random.randint(10000, 99999)}",
                address         = fake.address().replace("\n", ", "),

                # --- Balance fields ---
                total_paid          = Decimal("0.00"),
                outstanding_balance = Decimal("0.00"),
            )

            # Assign driver to this route
            route.driver = driver
            route.save()

            drivers.append(driver)
            self._credentials.append({
                "role": "DRIVER",
                "name": f"{driver.first_name} {driver.last_name}",
                "phone": phone, "password": PASSWORD,
                "under_owner": owner.phone_number,
            })
        return drivers

    # ── customers ─────────────────────────────────────────────────────────────
    def _seed_customers(self, owner: User, routes: list, drivers: list) -> list:
        customers    = []
        milk_choices = ["cow", "buffalo", "both"]

        # Shuffle customers across drivers (5 per driver, non-overlapping)
        driver_slots = []
        for driver in drivers:
            driver_slots.extend([driver] * CUSTOMERS_PER_DRIVER)
        random.shuffle(driver_slots)

        for i in range(CUSTOMERS_PER_OWNER):
            phone      = phone_pool.get()
            milk_type  = random.choice(milk_choices)
            route      = routes[i % len(routes)]
            driver     = driver_slots[i] if i < len(driver_slots) else None

            customer = User.objects.create(
                # --- AbstractUser required fields ---
                username       = f"cust_{owner.id}_{i + 1}",
                password       = make_password(PASSWORD),
                first_name     = fake.first_name(),
                last_name      = fake.last_name(),
                email          = fake.unique.email(),
                is_active      = True,

                # --- Role & ownership ---
                role            = "customer",
                parent_owner    = owner,

                # --- Customer-specific fields ---
                phone_number    = phone,
                address         = fake.address().replace("\n", ", "),
                milk_type       = milk_type,
                daily_quantity  = Decimal(str(random.choice([0.5, 1.0, 1.5, 2.0, 2.5, 3.0]))),
                route           = route,

                # --- Balance fields ---
                total_paid          = Decimal("0.00"),
                outstanding_balance = Decimal("0.00"),
            )

            customers.append(customer)
            self._credentials.append({
                "role": "CUSTOMER",
                "name": f"{customer.first_name} {customer.last_name}",
                "phone": phone, "password": PASSWORD,
                "under_owner": owner.phone_number,
            })

        return customers

    # ── historical data (fully bulk_create optimized) ─────────────────────────
    def _seed_history(self, owner: User, customers: list):
        today      = date.today()
        start_date = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
        for _ in range(MONTHS_OF_DATA - 1):
            start_date = (start_date - timedelta(days=1)).replace(day=1)

        # Build full date list once — reused for every customer
        all_dates = []
        d = start_date
        while d <= today:
            all_dates.append(d)
            d += timedelta(days=1)

        day_count = len(all_dates)
        self.stdout.write(
            f"    📅 Seeding {day_count} days x {len(customers)} customers "
            f"({day_count * len(customers):,} delivery records)..."
        )

        # ── PRE-STEP: Clear existing history for these customers to ensure consistency ──
        customer_ids = [c.id for c in customers]
        Delivery.objects.filter(customer_id__in=customer_ids).delete()
        Payment.objects.filter(customer_id__in=customer_ids).delete()

        # ── STEP 1: build all Delivery objects in memory ──────────────────────
        self.stdout.write("      ⚡ Building delivery records...")
        delivery_objs = []

        # customer → price mapping (based on their milk_type)
        def get_price(customer):
            if customer.milk_type == "buffalo":
                return owner.buffalo_price
            elif customer.milk_type == "cow":
                return owner.cow_price
            else:  # both — ALWAYS use buffalo_price for consistent ideal math
                return owner.buffalo_price

        for customer in customers:
            price  = get_price(customer)
            driver = getattr(customer.route, "driver", None)
            qty    = customer.daily_quantity

            for current in all_dates:

                # ALL historical dates = delivered, today = pending
                if current == today:
                    status       = "pending"
                    is_delivered = False
                    delivered_at = None
                    total_amount = Decimal("0.00")
                else:
                    status       = "delivered"
                    is_delivered = True
                    delivered_at = timezone.make_aware(
                        datetime.combine(current, time(random.randint(6, 9), random.randint(0, 59)))
                    )
                    total_amount = (qty * price).quantize(Decimal("0.01"))

                delivery_objs.append(Delivery(
                    customer          = customer,
                    driver            = driver,
                    route             = customer.route,
                    date              = current,
                    status            = status,
                    quantity          = qty,
                    price_at_delivery = price,
                    total_amount      = total_amount,
                    is_delivered      = is_delivered,
                    delivered_at      = delivered_at,
                ))

        # ── STEP 2: single bulk insert for ALL deliveries ─────────────────────
        self.stdout.write("      ⚡ Inserting deliveries in bulk...")
        Delivery.objects.bulk_create(delivery_objs, batch_size=2000)

        # ── STEP 3: build month boundaries once ───────────────────────────────
        month_ranges = []
        m = start_date
        while m < today:
            m_end = (m.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
            month_ranges.append((m, m_end))
            m = m_end + timedelta(days=1)

        # ── STEP 4: fetch all deliveries in ONE query, grouped in memory ───────
        self.stdout.write("      ⚡ Computing payments...")
        customer_ids   = [c.id for c in customers]
        all_deliveries = Delivery.objects.filter(
            customer_id__in = customer_ids,
            date__gte       = start_date,
            status          = "delivered",
        ).values("customer_id", "date", "total_amount")

        from collections import defaultdict
        cust_deliveries = defaultdict(list)
        for row in all_deliveries:
            cust_deliveries[row["customer_id"]].append(row)

        # ── STEP 5: build Payment objects in memory ───────────────────────────
        payment_objs        = []
        customers_to_update = []

        for customer in customers:
            rows        = cust_deliveries[customer.id]
            date_map    = {r["date"]: r["total_amount"] for r in rows}
            outstanding = sum(date_map.values())
            total_paid  = Decimal("0.00")
            driver      = getattr(customer.route, "driver", None)

            for (m_start, m_end) in month_ranges:
                month_total = sum(
                    amt for dt, amt in date_map.items()
                    if m_start <= dt <= m_end
                )

                if month_total > 0 and random.random() < 0.75:
                    pay_ratio    = Decimal(str(round(random.uniform(0.5, 1.0), 2)))
                    pay_amount   = (month_total * pay_ratio).quantize(Decimal("0.01"))
                    is_confirmed = random.random() < 0.80

                    payment_objs.append(Payment(
                        customer     = customer,
                        amount       = pay_amount,
                        date         = m_end - timedelta(days=random.randint(0, 5)),
                        received_by  = driver,
                        status       = "confirmed" if is_confirmed else "pending",
                        confirmed_at = timezone.now() if is_confirmed else None,
                        method       = random.choice(PAYMENT_METHODS),
                        note         = f"Monthly payment for {m_start.strftime('%B %Y')}",
                    ))

                    if is_confirmed:
                        outstanding -= pay_amount
                        total_paid  += pay_amount

            customer.outstanding_balance = max(Decimal("0.00"), outstanding)
            customer.total_paid          = total_paid
            customers_to_update.append(customer)

        # ── STEP 6: bulk insert payments + bulk update customer balances ───────
        self.stdout.write("      ⚡ Inserting payments in bulk...")
        Payment.objects.bulk_create(payment_objs, batch_size=2000)

        self.stdout.write("      ⚡ Updating customer balances...")
        User.objects.bulk_update(
            customers_to_update,
            ["outstanding_balance", "total_paid"],
            batch_size=500,
        )

    # ── write credentials txt ─────────────────────────────────────────────────
    def _write_credentials_file(self):
        # This file: backend/accounts/management/commands/seed.py
        # Go up 4 levels → backend/ (where manage.py lives)
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__)
        ))))
        output_path = os.path.join(base_dir, "rasad_credentials.txt")

        owners    = [c for c in self._credentials if c["role"] == "OWNER"]
        drivers   = [c for c in self._credentials if c["role"] == "DRIVER"]
        customers = [c for c in self._credentials if c["role"] == "CUSTOMER"]

        sep  = "=" * 68
        sep2 = "-" * 68

        lines = [
            sep,
            "  RASAD - TEST CREDENTIALS",
            f"  {NUM_OWNERS} owners  |  {NUM_OWNERS * DRIVERS_PER_OWNER} drivers"
            f"  |  {NUM_OWNERS * CUSTOMERS_PER_OWNER} customers",
            f"  All passwords: {PASSWORD}",
            sep, "",
            "  OWNERS", sep2,
            f"  {'#':<4} {'Dairy Name':<32} {'Phone':<14} {'Password'}",
            sep2,
        ]
        for i, c in enumerate(owners, 1):
            lines.append(f"  {i:<4} {c['name']:<32} {c['phone']:<14} {c['password']}")

        lines += ["", sep2, "", "  DRIVERS", sep2,
                  f"  {'#':<4} {'Name':<25} {'Phone':<14} {'Password':<14} {'Owner Phone'}",
                  sep2]
        for i, c in enumerate(drivers, 1):
            lines.append(
                f"  {i:<4} {c['name']:<25} {c['phone']:<14} {c['password']:<14} {c['under_owner']}"
            )

        lines += ["", sep2, "", "  CUSTOMERS", sep2,
                  f"  {'#':<4} {'Name':<25} {'Phone':<14} {'Password':<14} {'Owner Phone'}",
                  sep2]
        for i, c in enumerate(customers, 1):
            lines.append(
                f"  {i:<4} {c['name']:<25} {c['phone']:<14} {c['password']:<14} {c['under_owner']}"
            )

        lines += ["", sep, "  END OF CREDENTIALS", sep, ""]

        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        self.stdout.write(f"\n    📄 Credentials file written -> {output_path}")
