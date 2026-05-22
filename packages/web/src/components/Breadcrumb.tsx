interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface Props {
  path: BreadcrumbItem[];
  onNavigate: (id: string | null) => void;
}

export function Breadcrumb({ path, onNavigate }: Props) {
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-600 px-4 py-2 border-b">
      <button onClick={() => onNavigate(null)} className="hover:text-blue-600 font-medium">
        Home
      </button>
      {path.map((item) => (
        <span key={item.id} className="flex items-center gap-1">
          <span className="text-gray-400">/</span>
          <button onClick={() => onNavigate(item.id)} className="hover:text-blue-600">
            {item.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
