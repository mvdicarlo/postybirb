import { EuiFieldSearch } from '@elastic/eui';
import { useState } from 'react';

export default function AppSearch() {
  const [search, setSearch] = useState<string>('');

  return (
    <EuiFieldSearch
      value={search}
      onChange={(e) => setSearch(e.target.value || '')}
    />
  );
}
