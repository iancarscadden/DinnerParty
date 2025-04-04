import React, { createContext, useContext, useState } from 'react';
import { Group } from '../services/groups';

interface GroupContextType {
  group: Group | null;
  setGroup: (group: Group | null) => void;
}

const GroupContext = createContext<GroupContextType>({
  group: null,
  setGroup: () => {},
});

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [group, setGroup] = useState<Group | null>(null);

  return (
    <GroupContext.Provider value={{ group, setGroup }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  return useContext(GroupContext);
} 