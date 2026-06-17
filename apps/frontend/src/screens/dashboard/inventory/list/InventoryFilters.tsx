import { CustomSelect, Icon } from '../../../../components/app-shell';

const monthOptions = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

interface InventoryFiltersProps {
  localQuery: string;
  setLocalQuery: (q: string) => void;
  globalQuery: string;
  monthFilter: string;
  setMonthFilter: (m: string) => void;
  yearFilter: string;
  setYearFilter: (y: string) => void;
  years: string[];
  cats: string[];
  filter: string;
  setFilter: (c: string) => void;
}

export function InventoryFilters({
  localQuery,
  setLocalQuery,
  globalQuery,
  monthFilter,
  setMonthFilter,
  yearFilter,
  setYearFilter,
  years,
  cats,
  filter,
  setFilter,
}: InventoryFiltersProps) {
  return (
    <div
      data-reveal
      className="flex flex-wrap gap-2 mb-[18px]"
      style={{ position: 'relative', zIndex: 10 }}
    >
      <div className="searchbox min-w-[260px]">
        <Icon name="search" size={13} strokeWidth={2} className="text-ink-3" />
        <input
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder={globalQuery ? `Filter: "${globalQuery}"` : 'Cari aset…'}
        />
      </div>
      <CustomSelect
        value={monthFilter}
        onChange={setMonthFilter}
        options={monthOptions}
        style={{ width: '130px' }}
        placeholder="Semua Bulan"
      />
      <CustomSelect
        value={yearFilter}
        onChange={setYearFilter}
        options={[
          { value: 'all', label: 'Semua Tahun' },
          ...years.map((y) => ({ value: y, label: y })),
        ]}
        style={{ width: '130px' }}
        placeholder="Semua Tahun"
      />
      {cats.map((c) => (
        <button
          key={c}
          onClick={() => setFilter(c)}
          className={`btn sm ${filter === c ? 'primary' : ''}`}
          style={{ textTransform: 'capitalize' }}
        >
          {c === 'all' ? 'Semua' : c}
        </button>
      ))}
    </div>
  );
}
