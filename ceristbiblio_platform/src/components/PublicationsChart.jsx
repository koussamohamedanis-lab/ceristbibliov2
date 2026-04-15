import { useState } from 'react'
import { 
  LineChart, 
  BarChart,
  Line, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

/**
 * PublicationsChart - Visualize publications by year
 * 
 * Props:
 *   - data: Array of {year, count} objects from bibliometrix response
 *   - chartType: 'bar' | 'line' (default: 'bar')
 *   - title: Custom title (default: "Évolution des Publications par Année")
 * 
 * Usage with bibliometrix:
 *   const result = calculateGroupHIndex(publications)
 *   <PublicationsChart data={result.publications_by_year} chartType="bar" />
 */
const PublicationsChart = ({ 
  data = [], 
  chartType = 'bar',
  title = "Évolution des Publications par Année"
}) => {
  const [activeChart, setActiveChart] = useState(chartType)
  
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <p style={{ textAlign: 'center', color: 'var(--sec-text)', padding: '20px' }}>
          Aucune donnée de publication disponible
        </p>
      </div>
    )
  }

  const toyColor = 'var(--main-green)'
  const tooltipStyle = {
    backgroundColor: 'var(--bg-cartes)',
    border: '1px solid var(--bordres)',
    borderRadius: 'var(--radius)'
  }

  return (
    <div className="chart-container">
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="chart-title">{title}</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveChart('bar')}
            style={{
              padding: '6px 12px',
              backgroundColor: activeChart === 'bar' ? toyColor : 'transparent',
              color: activeChart === 'bar' ? 'white' : 'var(--sec-text)',
              border: `1px solid ${toyColor}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📊 Barres
          </button>
          <button
            onClick={() => setActiveChart('line')}
            style={{
              padding: '6px 12px',
              backgroundColor: activeChart === 'line' ? toyColor : 'transparent',
              color: activeChart === 'line' ? 'white' : 'var(--sec-text)',
              border: `1px solid ${toyColor}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📈 Courbe
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        {activeChart === 'bar' ? (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bordres)" />
            <XAxis 
              dataKey="year" 
              stroke="var(--sec-text)"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="var(--sec-text)" />
            <Tooltip 
              contentStyle={tooltipStyle}
              labelStyle={{ color: 'var(--main-text)' }}
              formatter={(value) => [`${value} publications`, 'Nombre']}
              labelFormatter={(label) => `Année: ${label}`}
            />
            <Legend />
            <Bar 
              dataKey="count" 
              fill={toyColor}
              name="Nombre de publications"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bordres)" />
            <XAxis 
              dataKey="year" 
              stroke="var(--sec-text)"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="var(--sec-text)" />
            <Tooltip 
              contentStyle={tooltipStyle}
              labelStyle={{ color: 'var(--main-text)' }}
              formatter={(value) => [`${value} publications`, 'Nombre']}
              labelFormatter={(label) => `Année: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke={toyColor}
              name="Nombre de publications"
              strokeWidth={3}
              dot={{ fill: toyColor, r: 5 }}
              activeDot={{ r: 7 }}
              isAnimationActive={true}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export default PublicationsChart
