import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronsUpDown, Mail, Plus } from "lucide-react";
import { cn } from "@/components/utils/cn";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"; // Assuming these exist or using basic input
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Since we might not have the Command component fully set up in all projects, 
// I'll implement a custom combobox-like structure if needed, but let's try to use standard UI components.
// Actually, to ensure reliability without relying on complex shadcn Command which might be missing parts,
// I'll build a robust custom selector.

export default function MultiRecipientSelector({ 
  recipients = [], 
  onChange, 
  clients = [], 
  placeholder = "הוסף נמענים..." 
}) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  
  // Extract emails from clients
  const clientEmails = clients
    .filter(c => c.email)
    .map(c => ({ 
      email: c.email, 
      label: `${c.name} (${c.email})`, 
      type: 'client' 
    }));

  const handleAdd = (email) => {
    if (!email) return;
    if (recipients.includes(email)) {
      setInputValue("");
      return;
    }
    onChange([...recipients, email]);
    setInputValue("");
    setIsOpen(false);
  };

  const handleRemove = (emailToRemove) => {
    onChange(recipients.filter(email => email !== emailToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      // Basic email validation
      if (inputValue.includes('@')) {
        handleAdd(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      handleRemove(recipients[recipients.length - 1]);
    }
  };

  const filteredClients = clientEmails.filter(c => 
    c.label.toLowerCase().includes(inputValue.toLowerCase()) && 
    !recipients.includes(c.email)
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
        {recipients.map((email, idx) => (
          <Badge key={idx} variant="secondary" className="gap-1 pl-1 pr-2 py-1 text-sm font-normal bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
            <Mail className="w-3 h-3 opacity-50" />
            {email}
            <button
              type="button"
              onClick={() => handleRemove(email)}
              className="mr-1 hover:text-red-500 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        
        <div className="relative flex-1 min-w-[120px]">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent outline-none text-sm h-7"
            placeholder={recipients.length === 0 ? placeholder : ""}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            onKeyDown={handleKeyDown}
          />
          
          {/* Dropdown for autocomplete */}
          {isOpen && (inputValue || filteredClients.length > 0) && (
            <div className="absolute top-full right-0 left-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-auto">
              {filteredClients.length > 0 ? (
                <ul className="py-1">
                  {filteredClients.map((client) => (
                    <li
                      key={client.email}
                      className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        handleAdd(client.email);
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                        {client.label.charAt(0)}
                      </div>
                      <span>{client.label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              
              {inputValue && inputValue.includes('@') && !filteredClients.find(c => c.email === inputValue) && (
                <div 
                  className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-blue-600 border-t"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAdd(inputValue);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  הוסף "{inputValue}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        הקלד כתובת מייל ולחץ Enter, או בחר מרשימת הלקוחות
      </p>
    </div>
  );
}