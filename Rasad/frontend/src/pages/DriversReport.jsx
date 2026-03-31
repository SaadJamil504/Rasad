import React, { useState, useEffect } from 'react';
import { dailyReportAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const DriversReport = () => {
    const { t } = useLanguage();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDailyReports = async () => {
            try {
                const res = await dailyReportAPI.getTodayReport();
                setReports(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Failed to fetch daily reports:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDailyReports();
    }, []);

    if (loading) {
        return <div className="page-container fade-in"><div className="loading">{t('Loading driver reports...', 'ڈرائیور کی رپورٹ لوڈ ہو رہی ہے')}</div></div>;
    }

    return (
        <div className="page-container fade-in">
            <div className="section-header" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                    {t('Today\'s Driver Reports', 'آج کی ڈرائیور رپورٹس')}
                </h2>
                <p style={{ color: '#64748b', marginTop: '0.5rem', fontWeight: 500 }}>
                    {t('Final summary reports submitted by drivers for today.', 'آج کے لیے ڈرائیورز کی طرف سے جمع کرائی گئی فائنل سمری رپورٹس۔')}
                </p>
            </div>

            {reports.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {reports.map(report => (
                        <div key={report.id} className="glass-card" style={{ background: 'white', padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                                <div style={{ background: '#f1f5f9', width: '45px', height: '45px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                    👤
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>{report.driver_name || report.driver_username}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{report.dairy_name} • {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{t('MILK', 'دودھ')}</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6' }}>{report.total_milk}L</div>
                                </div>
                                <div style={{ textAlign: 'center', borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{t('CASH', 'نقدی')}</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>Rs {parseFloat(report.total_cash).toLocaleString()}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{t('HOMES', 'گھر')}</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8b5cf6' }}>{report.customers_served} / {report.total_customers}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: '5rem 2rem', textAlign: 'center', background: 'white', borderRadius: '1.25rem', border: '2px dashed #e2e8f0' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 700 }}>{t('No reports submitted yet', 'ابھی تک کوئی رپورٹ جمع نہیں ہوئی')}</h3>
                    <p style={{ color: '#64748b', marginTop: '0.5rem' }}>{t('Check back later once drivers have completed their shifts.', 'ڈرائیورز کی شفٹ مکمل ہونے کے بعد دوبارہ چیک کریں۔')}</p>
                </div>
            )}
        </div>
    );
};

export default DriversReport;
