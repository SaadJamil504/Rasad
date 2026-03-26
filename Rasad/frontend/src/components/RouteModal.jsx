import React, { useState, useEffect } from 'react';
import { staffAPI, routeAPI } from '../services/api';
import CustomerProfileModal from '../components/CustomerProfileModal';
import ManualCustomerModal from '../components/ManualCustomerModal';
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
        className="sortable-item glass-card"
    >
        <div className="drag-handle">⋮⋮</div>
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
  const [isSequencing, setIsSequencing] = useState(false);
  const [orderedCustomers, setOrderedCustomers] = useState([]);
  const [isManualCustomerModalOpen, setIsManualCustomerModalOpen] = useState(false);

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
        // Initial order based on current assignment order (or sequence_order if returned)
        if (editRoute.customer_details) {
            const sortedBySeq = [...editRoute.customer_details].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
            setOrderedCustomers(sortedBySeq);
        }
      } else {
        setFormData({ name: '', driver: '', customer_ids: [] });
        setOrderedCustomers([]);
      }
      setIsSequencing(false);
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
      setAvailableCustomers(customersRes.data); // Show all customers
    } catch (err) {
      console.error('Failed to fetch assignment data:', err);
    }
  };

  const filteredCustomers = availableCustomers.filter(customer => 
    (customer.first_name || customer.username).toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.address?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const dataToSubmit = {
        ...formData,
        driver: formData.driver === '' ? null : formData.driver
      };

      if (editRoute) {
        await routeAPI.updateRoute(editRoute.id, dataToSubmit);
        // If we were in sequencing mode, ensure order is saved too (though the backend reorder view is better for batch)
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
      setFormData({ name: '', driver: '', customer_ids: [] });
      setOrderedCustomers([]);
      setSearchTerm('');
    } catch (err) {
      setError(err.response?.data?.error || ts(`Failed to ${editRoute ? 'update' : 'create'} route.`, `${editRoute ? 'روٹ کی تبدیلی' : 'نیا روٹ بنانے'} میں ناکامی ہوئی۔`));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content route-modal glass fade-in" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <h2>{editRoute ? t('Update Delivery Route', 'ڈیلیوری روٹ بدلیں') : t('Create Delivery Route', 'نیا ڈیلیوری روٹ بنائیں')}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-group">
              <label>{t('Route Identity', 'روٹ کا نام')}</label>
              <input
                type="text"
                required
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
                required
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
                  className={`tab-btn ${!isSequencing ? 'active' : ''}`}
                  onClick={() => setIsSequencing(false)}
                >
                  {t('Select Customers', 'گاہکوں کا انتخاب')}
                </button>
                <button 
                  type="button" 
                  className={`tab-btn ${isSequencing ? 'active' : ''}`}
                  onClick={() => {
                    if (formData.customer_ids.length === 0) {
                        alert(t('Select at least one customer first', 'پہلے کم از کم ایک گاہک منتخب کریں'));
                        return;
                    }
                    setIsSequencing(true);
                  }}
                >
                  {t('Set Sequence', 'ترتیب طے کریں')}
                </button>
              </div>
              
              {!isSequencing && (
                <div className="search-box">
                    <input 
                    type="text" 
                    placeholder={ts('Search by name...', 'نام سے تلاش کریں')} 
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
              )}
            </div>

            {isSequencing ? (
                <div className="sequencing-area fade-in">
                    <p className="helper-text">{t('Drag and move customers to set delivery sequence.', 'ڈیلیوری کی ترتیب طے کرنے کے لیے گاہکوں کو گھسیٹ کر اوپر نیچے کریں۔')}</p>
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext 
                            items={orderedCustomers.map(c => c.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="sortable-list">
                                {orderedCustomers.map((customer, index) => (
                                    <SortableCustomerItem 
                                        key={customer.id} 
                                        customer={customer} 
                                        index={index}
                                        t={t}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            ) : (
                <div className="selection-grid">
                {filteredCustomers.length === 0 ? (
                    <div className="no-results">
                    <p className="muted-text">
                        {searchTerm ? t('No customers match your search.', 'تلاش کے مطابق کوئی گاہک نہیں ملا۔') : t('No customers found in your database.', 'ڈیٹا بیس میں کوئی گاہک نہیں ملا۔')}
                    </p>
                    </div>
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
                        <div className="card-check">
                            <div className="check-circle"></div>
                        </div>
                        <div className="member-info">
                            <span className="member-name">
                            {customer.first_name || customer.username}
                            {isSelected && <span style={{ color: '#22c55e', fontSize: '0.8rem', marginLeft: '0.5rem' }}>({t('Selected', 'منتخب')})</span>}
                            {isAssignedElsewhere && <span style={{ color: '#ef4444', fontSize: '0.7rem', marginLeft: '0.5rem' }}>({t('In Route', 'روٹ میں ہے')})</span>}
                            </span>
                            <span className="member-detail">{customer.area}, {customer.city}</span>
                        </div>
                        </div>
                    );
                    })
                )}
                
                {/* Add New Customer Card - Always at the end */}
                {!searchTerm && (
                  <div 
                    className="add-customer-card-dotted"
                    onClick={() => setIsManualCustomerModalOpen(true)}
                  >
                    <div className="add-icon-small">
                      <span>+</span>
                    </div>
                    <span className="add-text-small">{t('Add New Customer', 'نیا گاہک شامل کریں')}</span>
                  </div>
                )}
                </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-s" onClick={onClose}>{t('Cancel', 'کینسل')}</button>
            <button type="submit" className="btn-p" disabled={loading}>
              {loading ? (editRoute ? t('Updating...', 'تبدیلی ہو رہی ہے...') : t('Creating...', 'تیار ہو رہا ہے...')) : (editRoute ? t('Confirm', 'تصدیق کریں') : t('Confirm & Create', 'تصدیق اور تخلیق کریں'))}
            </button>
          </div>
        </form>

        <ManualCustomerModal
          isOpen={isManualCustomerModalOpen}
          onClose={() => setIsManualCustomerModalOpen(false)}
          onSuccess={() => {
            fetchAssignmentData();
            setIsManualCustomerModalOpen(false);
          }}
        />
      </div>
    </div>
  );
};

export default RouteModal;
