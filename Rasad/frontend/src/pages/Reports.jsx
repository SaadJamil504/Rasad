import React, { useState, useEffect } from 'react';
import { deliveryAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const Reports = () => {
  const { t, language } = useLanguage();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await deliveryAPI.getReports();
        setReportData(res.data);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return <div className="page-container fade-in"><div className="loading">{t('Loading reports...', 'رپورٹ لوڈ ہو رہی ہے')}</div></div>;
  }

  if (!reportData) {
    return <div className="page-container fade-in"><div className="error">{t('Failed to load reports data.', 'رپورٹ کا ڈیٹا لوڈ نہیں ہو سکا۔')}</div></div>;
  }

  // Find max revenue and round to the next 10k interval
  const maxDataRev = Math.max(...reportData.monthly_revenue.map(d => d.revenue), 0);
  const maxRev = Math.max(Math.ceil(maxDataRev / 10000) * 10000, 40000); // ensure at least 40k to have 4 steps
  const stepsCount = maxRev / 10000;
  const yAxisSteps = Array.from({ length: stepsCount + 1 }, (_, i) => i * 10000).reverse();

  const monthNames = {
    'Jan': 'جنوری', 'Feb': 'فروری', 'Mar': 'مارچ', 'Apr': 'اپریل',
    'May': 'مئی', 'Jun': 'جون', 'Jul': 'جولائی', 'Aug': 'اگست',
    'Sep': 'ستمبر', 'Oct': 'اکتوبر', 'Nov': 'نومبر', 'Dec': 'دسمبر'
  };

  return (
    <div className="page-container fade-in" style={{ overflowX: 'hidden' }}>


      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        {/* Total Milk This Month */}
        <div className="glass-card" style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          borderLeft: '4px solid #3b82f6',
          background: 'white'
        }}>
          <div style={{ background: '#eff6ff', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: '#3b82f6' }}>
            🥛
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{t('Milk Delivered', 'ڈیلیور شدہ دودھ')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{reportData.this_month_milk}L</div>
          </div>
        </div>

        {/* Total Revenue This Month */}
        <div className="glass-card" style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          borderLeft: '4px solid #10b981',
          background: 'white'
        }}>
          <div style={{ background: '#f0fdf4', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#10b981' }}>
            PKR
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{t('Revenue', 'آمدنی')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>Rs {reportData.this_month_revenue.toLocaleString()}</div>
          </div>
        </div>

        {/* Collection Percentage */}
        <div className="glass-card" style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          flexDirection: 'column',
          gap: '0.75rem', 
          borderLeft: '4px solid #8b5cf6',
          background: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>{t('COLLECTION RATE', 'آمدنی کی شرح')}</span>
            <span style={{ fontSize: '1rem', color: '#8b5cf6', fontWeight: 800 }}>{reportData.collection_percentage.toFixed(1)}%</span>
          </div>
          <div style={{ background: '#f1f5f9', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', height: '100%', width: `${reportData.collection_percentage}%`, borderRadius: '5px' }}></div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: isMobile ? '1rem' : '2.5rem', background: 'white' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', color: '#1e293b', fontSize: isMobile ? '1.1rem' : '1.3rem' }}>{t('Revenue Trends', 'آمدنی کے رجحانات')}</h3>

        <div style={{ width: '100%', height: isMobile ? '300px' : '400px', position: 'relative', marginTop: '2rem', padding: '0 0 2rem 3rem' }}>
          {/* Y-Axis Labels (HTML) */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: '2rem', width: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '0.5rem', pointerEvents: 'none' }}>
            {yAxisSteps.map(val => (
              <div key={val} style={{ fontSize: isMobile ? '0.7rem' : '0.85rem', color: '#94a3b8', textAlign: 'right', fontWeight: 700 }}>
                {val >= 1000 ? (val/1000).toFixed(0)+'k' : val}
              </div>
            ))}
          </div>

          {/* SVG Area Chart */}
          <svg width="100%" height="calc(100% - 2rem)" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            {/* Horizontal Grid Lines */}
            {yAxisSteps.map((val, i) => {
              const y = (i * (100 / (yAxisSteps.length - 1)));
              return (
                <line key={val} x1="0" y1={y} x2="100" y2={y} stroke="#f1f5f9" strokeWidth="0.5" />
              );
            })}
            
            <path
              d={`
                M 0 100
                ${reportData.monthly_revenue.map((d, i) => {
                  const x = (i / (reportData.monthly_revenue.length - 1)) * 100;
                  const y = 100 - (d.revenue / maxRev) * 100;
                  return `L ${x} ${y}`;
                }).join(' ')}
                L 100 100
                Z
              `}
              fill="url(#areaGradient)"
            />

            {/* Line Path */}
            <path
              d={`
                M ${0} ${100 - (reportData.monthly_revenue[0].revenue / maxRev) * 100}
                ${reportData.monthly_revenue.slice(1).map((d, i) => {
                  const x = ((i + 1) / (reportData.monthly_revenue.length - 1)) * 100;
                  const y = 100 - (d.revenue / maxRev) * 100;
                  return `L ${x} ${y}`;
                }).join(' ')}
              `}
              fill="none"
              stroke="#10b981"
              strokeWidth={isMobile ? "1.5" : "0.5"}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Gradient Definition */}
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {reportData.monthly_revenue.map((d, i) => {
              const x = (i / (reportData.monthly_revenue.length - 1)) * 100;
              const y = 100 - (d.revenue / maxRev) * 100;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={isMobile ? "1.5" : "0.5"} fill="white" stroke="#10b981" strokeWidth={isMobile ? "0.8" : "0.3"} />
                  {d.revenue > 0 && (
                    <text 
                      x={x} 
                      y={y - (isMobile ? 5 : 4)} 
                      fontSize={isMobile ? "3.5" : "2"} 
                      fill="#334155" 
                      textAnchor="middle" 
                      fontWeight="800"
                    >
                      {(d.revenue >= 1000 ? (d.revenue / 1000).toFixed(0) + 'k' : d.revenue)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* X-Axis Labels (HTML) */}
          <div style={{ position: 'absolute', left: '3rem', right: 0, bottom: 0, height: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pointerEvents: 'none' }}>
            {reportData.monthly_revenue.map((d, i) => (
              <div 
                key={i} 
                className={language === 'ur' ? 'urdu-text' : ''}
                style={{ 
                  fontSize: isMobile ? '0.75rem' : '0.9rem', 
                  color: '#64748b', 
                  fontWeight: 700,
                  transform: 'translateX(-50%)',
                  position: 'absolute',
                  left: `${(i / (reportData.monthly_revenue.length - 1)) * 100}%`,
                  bottom: 0,
                  fontFamily: language === 'ur' ? 'Noto Nastaliq Urdu' : 'Inter, sans-serif'
                }}
              >
                {language === 'ur' ? (monthNames[d.month.substring(0, 3)] || d.month.substring(0, 3)) : d.month.substring(0, 3)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
