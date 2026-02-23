import { useState } from 'react';

export const AIProfileForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const [apiKey, setApiKey] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ apiKey }); }}>
      <input placeholder="Enter your API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
      <button type="submit">Save Profile</button>
    </form>
  );
};
