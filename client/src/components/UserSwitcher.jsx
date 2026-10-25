import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function UserSwitcher({ users, activeUserId, onUserChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const activeUser = users.find(u => u.id === activeUserId) || users[0] || {
    name: 'Alice Chen',
    email: 'alice@ajaia.internal',
    avatar_color: '#4f46e5',
    role_title: 'Product Lead'
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="user-switcher-container" ref={containerRef}>
      <button
        type="button"
        className="user-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch simulated team member persona"
      >
        <span
          className="user-avatar"
          style={{ backgroundColor: activeUser.avatar_color }}
        >
          {activeUser.name.charAt(0)}
        </span>
        <span style={{ fontWeight: 600 }}>{activeUser.name}</span>
        <ChevronDown size={14} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div className="user-switcher-dropdown">
          <div className="dropdown-header">Switch Reviewer Persona</div>
          {users.map((u) => {
            const isSelected = u.id === activeUserId;
            return (
              <button
                key={u.id}
                type="button"
                className={`user-option-btn ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  onUserChange(u.id);
                  setIsOpen(false);
                }}
              >
                <span
                  className="user-avatar"
                  style={{ backgroundColor: u.avatar_color }}
                >
                  {u.name.charAt(0)}
                </span>
                <div className="user-option-info">
                  <div className="user-option-name">{u.name}</div>
                  <div className="user-option-email">{u.email}</div>
                  <div className="user-option-role">{u.role_title}</div>
                </div>
                {isSelected && <Check size={16} color="var(--primary)" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
