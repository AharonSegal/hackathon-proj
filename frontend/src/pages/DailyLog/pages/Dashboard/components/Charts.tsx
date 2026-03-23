import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const PALETTE = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#10b981', '#3b82f6', '#8b5cf6', '#f97316'];
const ACCENT   = '#6366f1';
const TEAL     = '#14b8a6';
const PURPLE   = '#a855f7';

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '13px',
};

const axisStyle = { fill: '#94a3b8', fontSize: 11 };

interface ChartsProps {
  tasksOverTime: { date: string; count: number }[];
  techUsage: { name: string; count: number }[];
  categories: { name: string; value: number }[];
  soloTeam: { name: string; count: number }[];
  projects: { name: string; count: number }[];
  subTechData: Record<string, string | number>[];
}

function ChartCard({ title, children, fullWidth = false }: { title: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl p-4${fullWidth ? ' col-span-full' : ''}`}>
      <h3 className="text-sm font-semibold text-slate-300 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function Charts({ tasksOverTime, techUsage, categories, soloTeam, projects, subTechData }: ChartsProps) {
  const subKeys = new Set<string>();
  subTechData.forEach((row) => {
    Object.keys(row).forEach((k) => { if (k !== 'tech') subKeys.add(k); });
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ChartCard title="Tasks Over Time" fullWidth>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={tasksOverTime}>
            <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#334155' }} />
            <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Technology Usage">
        <ResponsiveContainer width="100%" height={Math.max(200, techUsage.length * 32)}>
          <BarChart data={techUsage} layout="vertical">
            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#334155' }} />
            <Bar dataKey="count" fill={TEAL} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Categories">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={categories} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
              {categories.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Solo vs Team">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={soloTeam.map((s) => ({ name: s.name, value: s.count }))}
              dataKey="value" nameKey="name"
              cx="50%" cy="50%"
              innerRadius={50} outerRadius={80} paddingAngle={3}
            >
              <Cell fill={ACCENT} />
              <Cell fill="#f59e0b" />
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Projects">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={projects}>
            <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#334155' }} />
            <Bar dataKey="count" fill={PURPLE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {subTechData.length > 0 && (
        <ChartCard title="Sub-Tech Breakdown" fullWidth>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={subTechData}>
              <XAxis dataKey="tech" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#334155' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {[...subKeys].map((key, i) => (
                <Bar
                  key={key} dataKey={key} stackId="a"
                  fill={PALETTE[i % PALETTE.length]}
                  radius={i === [...subKeys].length - 1 ? [4, 4, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}
