import React, { useState, useEffect } from 'react';
import { staffAPI, routeAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useClickOutside } from '../hooks/useClickOutside';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './RouteModal.css';

const SortableCustomerItem = ({ customer, index, t }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: customer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes} 
        {...listeners}
        className="sortable-item"
    >
        <div className="drag-handle" style={{ color: '#cbd5e1', fontSize: '1.2rem', cursor: 'grab' }}>⋮⋮</div>
        <span className="index-circle">{index + 1}</span>
        <div className="member-info">
            <span className="member-name">{customer.first_name || customer.username}</span>
            <span className="member-detail">{customer.area}, {customer.city}</span>
        </div>
    </div>
  );
};

const RouteModal = ({ isOpen, onClose, onRouteCreated, editRoute }) => {
  const { t, ts } = useLanguage();
  const modalRef = React.useRef(null);
  useClickOutside(modalRef, onClose);
  
  const [formData, setFormData] = useState({
    name: '',
    driver: '',
    customer_ids: []
  });
  
  const [drivers, setDrivers] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('select'); // 'select', 'sequence', 'add'
  const [orderedCustomers, setOrderedCustomers] = useState([]);
  
  // Local state for Integrated Add Customer form
  const [manualCustomerForm, setManualCustomerForm] = useState({
    first_name: '',
    phone_number: '',
    house_no: '',
    street: '',
    area: '',
    city: 'Peshawar',
    milk_type: 'buffalo',
    daily_quantity: '',
  });
  const [addingCustomer, setAddingCustomer] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      if (editRoute) {
        setFormData({
          name: editRoute.name || '',
          driver: editRoute.driver || '',
          customer_ids: editRoute.assigned_customer_ids || []
        });
        if (editRoute.customer_details) {
            const sortedBySeq = [...editRoute.customer_details].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
            setOrderedCustomers(sortedBySeq);
        }
      } else {
        setFormData({ name: '', driver: '', customer_ids: [] });
        setOrderedCustomers([]);
      }
      setActiveTab('select');
      fetchAssignmentData();
    }
  }, [isOpen, editRoute]);

  const fetchAssignmentData = async () => {
    try {
      const [driversRes, customersRes] = await Promise.all([
        staffAPI.getStaff('driver'),
        staffAPI.getStaff('customer') 
      ]);
      setDrivers(driversRes.data);
      setAvailableCustomers(customersRes.data);
    } catch (err) {
      console.error('Failed to fetch assignment data:', err);
    }
  };

  const filteredCustomers = availableCustomers.filter(customer => 
    (customer.first_name || customer.username).toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomerToggle = (customer) => {
    const isSelected = formData.customer_ids.includes(customer.id);
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        customer_ids: prev.customer_ids.filter(id => id !== customer.id)
      }));
      setOrderedCustomers(prev => prev.filter(c => c.id !== customer.id));
    } else {
      setFormData(prev => ({
        ...prev,
        customer_ids: [...prev.customer_ids, customer.id]
      }));
      setOrderedCustomers(prev => [...prev, customer]);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setOrderedCustomers((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleManualCustomerSubmit = async (e) => {
    e.preventDefault();
    setAddingCustomer(true);
    setError('');
    try {
      const res = await staffAPI.createStaff(manualCustomerForm);
      const newCust = res.data;
      
      // Successfully added. Now:
      // 1. Refresh available customers
      await fetchAssignmentData();
      // 2. Automatically select this customer
      setFormData(prev => ({
        ...prev,
        customer_ids: [...prev.customer_ids, newCust.id]
      }));
      setOrderedCustomers(prev => [...prev, newCust]);
      // 3. Reset form and switch tab
      setManualCustomerForm({
        first_name: '',
        phone_number: '',
        house_no: '',
        street: '',
        area: '',
        city: 'Peshawar',
        milk_type: 'buffalo',
        daily_quantity: '',
      });
      setActiveTab('select');
      alert(t('Customer added and selected!', 'گاہک شامل کر لیا گیا اور منتخب کر لیا گیا ہے!'));
    } catch (err) {
      setError(err.response?.data?.error || ts('Failed to add customer. Check phone number.', 'گاہک شامل کرنے میں ناکامی ہوئی۔ فون نمبر چیک کریں۔'));
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeTab === 'add') return; // Prevent route submit while in add customer tab
    
    setLoading(true);
    setError('');
    try {
      const dataToSubmit = {
        ...formData,
        driver: formData.driver === '' ? null : formData.driver
      };

      if (editRoute) {
        await routeAPI.updateRoute(editRoute.id, dataToSubmit);
        if (orderedCustomers.length > 0) {
            await routeAPI.reorderCustomers(editRoute.id, orderedCustomers.map(c => c.id));
        }
        alert(ts('Route updated successfully!', 'روٹ میں کامیابی سے تبدیلی کر دی گئی ہے!'));
      } else {
        const res = await routeAPI.createRoute(dataToSubmit);
        if (orderedCustomers.length > 0) {
            await routeAPI.reorderCustomers(res.data.id, orderedCustomers.map(c => c.id));
        }
        alert(ts('Route created successfully!', 'نیا روٹ کامیابی سے بنا لیا گیا ہے!'));
      }
      onRouteCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || ts(`Failed to ${editRoute ? 'update' : 'create'} route.`, `${editRoute ? 'روٹ کی تبدیلی' : 'نیا روٹ بنانے'} میں ناکامی ہوئی۔`));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content route-modal fade-in" ref={modalRef}>
        <div className="modal-header-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
              {editRoute ? t('Update Delivery Route', 'روٹ تبدیل کریں') : t('Create Delivery Route', 'نیا روٹ بنائیں')}
            </h2>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
        </div>
        
        <div className="modal-form">
          <div className="form-body-scrollable">
            <div className="form-grid">
              <div className="form-group">
                <label>{t('Route Identity', 'روٹ کا نام')}</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder={ts('e.g. Gulberg Morning', 'مثلاً گلبرگ مارننگ')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{t('Assign Driver', 'ڈرائیور مقرر کریں')}</label>
                <select
                  className="glass-input"
                  value={formData.driver}
                  onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                >
                  <option value="">{ts('Select a Driver', 'ڈرائیور منتخب کریں')}</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.first_name || driver.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <div className="tab-buttons">
                  <button 
                    type="button" 
                    className={`tab-btn ${activeTab === 'select' ? 'active' : ''}`}
                    onClick={() => setActiveTab('select')}
                  >
                    {t('Select', 'انتخاب')}
                  </button>
                  <button 
                    type="button" 
                    className={`tab-btn ${activeTab === 'sequence' ? 'active' : ''}`}
                    onClick={() => {
                      if (formData.customer_ids.length === 0) {
                          alert(t('Select customers first', 'پہلے گاہک منتخب کریں'));
                          return;
                      }
                      setActiveTab('sequence');
                    }}
                  >
                    {t('Sequence', 'ترتیب')}
                  </button>
                  <button 
                    type="button" 
                    className={`tab-btn add-customer-tab-btn ${activeTab === 'add' ? 'active' : ''}`}
                    onClick={() => setActiveTab('add')}
                  >
                    {t('Add New', 'نیا گاہک')}
                  </button>
                </div>
                
                {activeTab === 'select' && (
                  <div className="search-box">
                      <input 
                        type="text" 
                        placeholder={ts('Search by name or area...', 'تلاش کریں...')} 
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                )}
              </div>

              {activeTab === 'sequence' && (
                  <div className="sequencing-area fade-in">
                      <div className="sortable-list">
                          <DndContext 
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                          >
                              <SortableContext 
                                  items={orderedCustomers.map(c => c.id)}
                                  strategy={verticalListSortingStrategy}
                              >
                                  {orderedCustomers.map((customer, index) => (
                                      <SortableCustomerItem 
                                          key={customer.id} 
                                          customer={customer} 
                                          index={index}
                                          t={t}
                                      />
                                  ))}
                              </SortableContext>
                          </DndContext>
                      </div>
                  </div>
              )}

              {activeTab === 'select' && (
                  <div className="selection-grid fade-in">
                    {filteredCustomers.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '0.9rem' }}>{t('No customers found.', 'کوئی گاہک نہیں ملا۔')}</p>
                    ) : (
                        filteredCustomers.map(customer => {
                          const isAssignedElsewhere = customer.route && (!editRoute || customer.route !== editRoute.id);
                          const isSelected = formData.customer_ids.includes(customer.id);
                          
                          return (
                              <div 
                                key={customer.id} 
                                className={`member-card ${isSelected ? 'selected' : ''} ${isAssignedElsewhere ? 'disabled' : ''}`}
                                onClick={() => !isAssignedElsewhere && handleCustomerToggle(customer)}
                              >
                                <div className="check-circle"></div>
                                <div className="member-info">
                                    <span className="member-name">{customer.first_name || customer.username}</span>
                                    <span className="member-detail">{customer.area}, {customer.city}</span>
                                    {isAssignedElsewhere && <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>{t('In Route', 'روٹ میں ہے')}</span>}
                                </div>
                              </div>
                          );
                        })
                    )}
                  </div>
              )}

              {activeTab === 'add' && (
                <div className="integrated-add-form fade-in">
                  <form onSubmit={handleManualCustomerSubmit}>
                    <div className="compact-form-grid">
                      <div className="form-group">
                        <label>{t('Full Name', 'پورا نام')}</label>
                        <input 
                          required 
                          type="text" 
                          className="search-input" 
                          value={manualCustomerForm.first_name}
                          onChange={e => setManualCustomerForm({...manualCustomerForm, first_name: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('Phone', 'فون')}</label>
                        <input 
                          required 
                          type="text" 
                          className="search-input" 
                          value={manualCustomerForm.phone_number}
                          onChange={e => setManualCustomerForm({...manualCustomerForm, phone_number: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="compact-form-grid" style={{ marginTop: '0.5rem' }}>
                      <div className="form-group">
                        <label>{t('House No', 'گھر نمبر')}</label>
                        <input 
                          type="text" 
                          className="search-input" 
                          value={manualCustomerForm.house_no}
                          onChange={e => setManualCustomerForm({...manualCustomerForm, house_no: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('Street', 'گلی')}</label>
                        <input 
                          type="text" 
                          className="search-input" 
                          value={manualCustomerForm.street}
                          onChange={e => setManualCustomerForm({...manualCustomerForm, street: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="compact-form-grid" style={{ marginTop: '0.5rem' }}>
                      <div className="form-group">
                        <label>{t('Area', 'علاقہ')}</label>
                        <input 
                          type="text" 
                          className="search-input" 
                          value={manualCustomerForm.area}
                          onChange={e => setManualCustomerForm({...manualCustomerForm, area: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('City', 'شہر')}</label>
                        <input 
                          required
                          type="text" 
                          className="search-input" 
                          value={manualCustomerForm.city}
                          onChange={e => setManualCustomerForm({...manualCustomerForm, city: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="compact-form-grid" style={{ marginTop: '0.5rem' }}>
                      <div className="form-group">
                        <label>{t('Milk Type', 'دودھ کی قسم')}</label>
                        <select 
                          className="search-input"
                          value={manualCustomerForm.milk_type}
                          onChange={e => setManualCustomerForm({...manualCustomerForm, milk_type: e.target.value})}
                        >
                          <option value="buffalo">{t('Buffalo', 'بھینس')}</option>
                          <option value="cow">{t('Cow', 'گائے')}</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>{t('Daily Qty (L)', 'روزانہ مقدار')}</label>
                        <input 
                          required
                          type="number" 
                          step="0.5"
                          className="search-input" 
                          value={manualCustomerForm.daily_quantity}
                          onChange={e => setManualCustomerForm({...manualCustomerForm, daily_quantity: e.target.value})}
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="btn-p" 
                      disabled={addingCustomer}
                      style={{ marginTop: '1rem', width: '100%' }}
                    >
                      {addingCustomer ? t('Adding...', 'شامل ہو رہا ہے...') : t('Save & Select Customer', 'محفوظ کریں اور منتخب کریں')}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>{error}</div>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-s" onClick={onClose}>{t('Cancel', 'کینسل')}</button>
            <button 
              type="button" 
              className="btn-p" 
              disabled={loading || activeTab === 'add'} 
              onClick={handleSubmit}
            >
              {loading ? (editRoute ? t('Updating...', 'تبدیلی ہو رہی ہے...') : t('Creating...', 'تیار ہو رہا ہے...')) : (editRoute ? t('Update Route', 'روٹ تبدیل کریں') : t('Confirm & Create', 'روٹ بنائیں'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteModal;
