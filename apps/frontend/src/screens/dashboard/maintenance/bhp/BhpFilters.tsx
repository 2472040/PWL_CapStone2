import { CustomSelect } from '../../../../components/app-shell';

export const monthOptions = [
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

interface BhpFiltersProps {
  monthFilter: string;
  setMonthFilter: (v: string) => void;
  yearFilter: string;
  setYearFilter: (v: string) => void;
  roomFilter: string;
  setRoomFilter: (v: string) => void;
  years: string[];
  rooms: Array<{ id: number; code: string; name: string }>;
}

export function BhpFilters({
  monthFilter,
  setMonthFilter,
  yearFilter,
  setYearFilter,
  roomFilter,
  setRoomFilter,
  years,
  rooms,
}: BhpFiltersProps) {
  return (
    <div
      data-reveal
      className="flex flex-wrap gap-2 mb-[18px]"
      style={{ position: 'relative', zIndex: 10 }}
    >
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
      <CustomSelect
        value={roomFilter}
        onChange={setRoomFilter}
        options={[
          { value: 'all', label: 'Semua Ruangan' },
          ...rooms.map((r) => ({
            value: r.id.toString(),
            label: `${r.code} - ${r.name}`,
          })),
        ]}
        style={{ width: '180px' }}
        placeholder="Semua Ruangan"
      />
    </div>
  );
}
