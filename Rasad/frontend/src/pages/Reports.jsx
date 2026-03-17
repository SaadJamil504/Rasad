import React, { useState, useEffect } from 'react';
import { deliveryAPI } from '../services/api';

const Reports = () => {
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
    return <div className="page-container fade-in"><div className="loading">Loading reports...</div></div>;
  }

  if (!reportData) {
    return <div className="page-container fade-in"><div className="error">Failed to load reports data.</div></div>;
  }

  // Find max revenue and round to the next 10k interval
  const maxDataRev = Math.max(...reportData.monthly_revenue.map(d => d.revenue), 0);
  const maxRev = Math.max(Math.ceil(maxDataRev / 10000) * 10000, 40000); // ensure at least 40k to have 4 steps
  const stepsCount = maxRev / 10000;
  const yAxisSteps = Array.from({ length: stepsCount + 1 }, (_, i) => i * 10000).reverse();

  return (
    <div className="page-container fade-in" style={{ overflowX: 'hidden' }}>


      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: isMobile ? '1rem' : '2rem', 
        marginBottom: '2rem' 
      }}>
        {/* Total Milk This Month */}
        <div className="glass-card" style={{ 
          padding: isMobile ? '1.25rem' : '2rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          borderLeft: '4px solid #3b82f6' 
        }}>
          <div style={{ background: '#eff6ff', width: isMobile ? '50px' : '60px', height: isMobile ? '50px' : '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '0.8rem' : '1rem', fontWeight: 800, color: '#3b82f6' }}>
            MLK
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>MILK DELIVERED</div>
            <div style={{ fontSize: isMobile ? '1.4rem' : '2rem', fontWeight: 800, color: '#1e293b' }}>{reportData.this_month_milk}L</div>
          </div>
        </div>

        {/* Total Revenue This Month */}
        <div className="glass-card" style={{ 
          padding: isMobile ? '1.25rem' : '2rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          borderLeft: '4px solid #10b981' 
        }}>
          <div style={{ background: '#f0fdf4', width: isMobile ? '50px' : '60px', height: isMobile ? '50px' : '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '0.8rem' : '1rem', fontWeight: 800, color: '#10b981' }}>
            PKR
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>REVENUE</div>
            <div style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 800, color: '#1e293b' }}>Rs {reportData.this_month_revenue.toLocaleString()}</div>
          </div>
        </div>

        {/* Collection Percentage */}
        <div className="glass-card" style={{ 
          padding: isMobile ? '1.25rem' : '2rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          borderLeft: '4px solid #8b5cf6' 
        }}>
          <div style={{ background: '#f5f3ff', width: isMobile ? '50px' : '60px', height: isMobile ? '50px' : '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '0.8rem' : '1rem', fontWeight: 800, color: '#8b5cf6' }}>
            COL
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>COLLECTION</span>
              <span style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 800 }}>{reportData.collection_percentage.toFixed(1)}%</span>
            </div>
            <div style={{ background: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ background: '#8b5cf6', height: '100%', width: `${reportData.collection_percentage}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: isMobile ? '1.25rem' : '2.5rem' }}>
        <h3 style={{ margin: '0 0 2rem 0', color: '#1e293b' }}>Monthly Revenue Overview</h3>

        {/* Improved Responsive Graph Container */}
        <div style={{ display: 'flex', gap: '1rem', height: '320px', alignItems: 'stretch' }}>
          
          {/* Y-Axis (Standard Flow) */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between', 
            color: '#94a3b8', 
            fontSize: '0.7rem', 
            fontWeight: 700, 
            alignItems: 'flex-end', 
            paddingBottom: '2.5rem',
            width: '40px',
            flexShrink: 0
          }}>
            {yAxisSteps.map((step, i) => (
              <span key={i}>{step === 0 ? '0' : `${(step / 1000).toFixed(0)}k`}</span>
            ))}
          </div>

          {/* Chart Area with Fluid Fill and Conditional Scroll */}
          <div style={{ flex: 1, overflowX: 'auto', paddingBottom: '2.5rem', display: 'flex' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-end', 
              gap: '1rem', 
              flex: 1, 
              borderBottom: '2px solid #e2e8f0', 
              position: 'relative'
            }}>
              
              {/* Grid Lines */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 0 }}>
                {yAxisSteps.map((step, i) => (
                  <div key={i} style={{ width: '100%', height: '1px', borderBottom: step === 0 ? 'none' : '1px dashed #e2e8f0' }}></div>
                ))}
              </div>

              {/* Bars */}
              {reportData.monthly_revenue.map((data, index) => {
                const heightPct = (data.revenue / maxRev) * 100;
                return (
                  <div key={index} style={{ 
                    flex: 1, 
                    minWidth: '40px',
                    maxWidth: '100px',
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    height: '100%', 
                    justifyContent: 'flex-end', 
                    zIndex: 1, 
                    position: 'relative' 
                  }}>
                    <div
                      className="chart-bar"
                      style={{
                        width: '80%',
                        height: `${heightPct}%`,
                        background: 'linear-gradient(to top, #10b981, #34d399)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'all 0.5s ease',
                        position: 'relative',
                        boxShadow: '0 4px 6px rgba(16, 185, 129, 0.15)'
                      }}
                      title={`Rs ${data.revenue.toLocaleString()}`}
                    >
                      <div style={{ 
                        position: 'absolute', 
                        top: '-20px', 
                        width: '140%', 
                        left: '-20%', 
                        textAlign: 'center', 
                        fontSize: '0.65rem', 
                        fontWeight: 800, 
                        color: '#1e293b', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {data.revenue >= 1000 ? (data.revenue / 1000).toFixed(1) + 'k' : data.revenue}
                      </div>
                    </div>
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '-2rem', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      color: '#64748b', 
                      whiteSpace: 'nowrap',
                      textAlign: 'center'
                    }}>
                      {data.month}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
