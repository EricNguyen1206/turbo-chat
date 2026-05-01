import { useState, useRef } from 'react';
import { Search, X, User } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSearchUsersQuery } from '@/services/api/users';
import type { UserDto } from '@turbo-chat/types';

interface UserSearchInputProps {
  selectedUsers: UserDto[];
  onUsersChange: (users: UserDto[]) => void;
  maxUsers?: number;
  minUsers?: number;
  disabled?: boolean;
  currentUserId?: string;
}

export const UserSearchInput = ({
  selectedUsers,
  onUsersChange,
  maxUsers = 4,
  minUsers = 2,
  disabled = false,
  currentUserId,
}: UserSearchInputProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use generated API hook for user search
  const { data: searchResponse, isLoading: isSearching } = useSearchUsersQuery(searchTerm);

  // Extract data from response and filter out already selected users and current user
  const searchResults = searchResponse || [];
  const filteredResults = searchResults.filter(
    (user: UserDto) =>
      !selectedUsers.some((selected) => selected.id === user.id) &&
      (!currentUserId || user.id !== currentUserId)
  );

  const handleUserSelect = (user: UserDto) => {
    if (selectedUsers.length >= maxUsers) return;

    onUsersChange([...selectedUsers, user]);
    setSearchTerm('');
    setShowResults(false);
    inputRef.current?.focus();
  };

  const handleUserRemove = (userId: string) => {
    onUsersChange(selectedUsers.filter((user) => user.id !== userId));
  };

  const handleInputFocus = () => {
    if (filteredResults.length > 0) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow clicking on them
    setTimeout(() => setShowResults(false), 200);
  };

  const isMaxUsersReached = selectedUsers.length >= maxUsers;
  const isMinUsersReached = selectedUsers.length >= minUsers;

  return (
    <div className="relative w-full">
      <div className="flex flex-col gap-3">
        {/* Selected Users Display */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <Badge
                key={user.id}
                variant="secondary"
                className="flex items-center gap-2 px-3 py-1"
              >
                <User className="h-3 w-3" />
                <span className="text-sm">{user.username}</span>
                <button
                  type="button"
                  onClick={() => handleUserRemove(user.id!)}
                  className="ml-1 hover:text-destructive"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* User Count Indicator */}
        <div className="text-xs text-muted-foreground">
          {selectedUsers.length} / {maxUsers} users selected
          {!isMinUsersReached && (
            <span className="text-destructive ml-2">(Minimum {minUsers} users required)</span>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search users by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={disabled || isMaxUsersReached}
            className="pl-10 pr-4"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && filteredResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
            {filteredResults.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleUserSelect(user)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.username}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {showResults && searchTerm && filteredResults.length === 0 && !isSearching && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-lg">
            No users found with that username
          </div>
        )}
      </div>
    </div>
  );
};
