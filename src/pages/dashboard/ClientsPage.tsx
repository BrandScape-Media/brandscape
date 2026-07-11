export default function ClientsPage() {
  const clients = [
    { name: 'Nike', industry: 'Sportswear', projects: 4, lastActive: '2 hours ago', logo: '🏃' },
    { name: 'Spotify', industry: 'Technology', projects: 2, lastActive: '1 day ago', logo: '🎵' },
    { name: 'Local Coffee Co.', industry: 'Food & Beverage', projects: 1, lastActive: '3 days ago', logo: '☕' },
    { name: 'Adidas', industry: 'Sportswear', projects: 3, lastActive: '5 hours ago', logo: '⚡' },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-bold text-2xl">Clients</h1>
          <p className="text-brand-500 text-sm font-body mt-1">
            Manage your client database and brand profiles.
          </p>
        </div>
        <button className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors">
          + ADD CLIENT
        </button>
      </div>

      <div className="bg-brand-900/30 border border-white/5 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/5 text-xs font-heading tracking-wide uppercase text-brand-600">
          <div className="col-span-1"></div>
          <div className="col-span-4">Client</div>
          <div className="col-span-3">Industry</div>
          <div className="col-span-2">Projects</div>
          <div className="col-span-2">Last Active</div>
        </div>

        {/* Rows */}
        {clients.map((client, i) => (
          <div
            key={i}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors cursor-pointer border-b border-white/5 last:border-0"
          >
            <div className="col-span-1 text-2xl">{client.logo}</div>
            <div className="col-span-1 sm:col-span-4">
              <span className="font-heading font-semibold text-sm text-white">{client.name}</span>
            </div>
            <div className="col-span-1 sm:col-span-3 text-brand-500 text-sm font-body">{client.industry}</div>
            <div className="col-span-1 sm:col-span-2 text-brand-400 text-sm font-heading">{client.projects}</div>
            <div className="col-span-1 sm:col-span-2 text-brand-600 text-sm font-body">{client.lastActive}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
