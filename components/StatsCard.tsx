interface StatsCardProps {
  title: string;
  value: number | string;
}

export default function StatsCard({ title, value }: StatsCardProps) {
  return (
    <div className="bg-white p-6 rounded shadow w-64">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-2xl mt-2">{value}</p>
    </div>
  );
}
