const KPICard = ({ title, value, icon }) => {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-content">
        <p className="kpi-title">{title}</p>
        <p className="kpi-value">{value ?? 'N/A'}</p>
      </div>
    </div>
  )
}

export default KPICard
