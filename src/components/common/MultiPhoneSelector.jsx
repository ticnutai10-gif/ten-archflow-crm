import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronsUpDown, Smartphone, Plus } from "lucide-react";
import { cn } from "@/components/utils/cn";
import { Badge } from "@/components/ui/badge";

export default function MultiPhoneSelector({ 
  recipients = [], 
  onChange, 
  clients = [], 
  placeholder = "הוסף נמענים..." 
}) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  
  // Extract phones from clients
  const clientPhones = clients
    .flatMap(c => {
      const phones = [];
      if (c.phone) phones.push({ phone: c.phone, label: `${c.name} (${c.phone})` });
      if (c.phone_secondary) phones.push({ phone: c.phone_secondary, label: `${c.name} (נוסף: ${c.phone_secondary})` });
      if (c.whatsapp) phones.push({ phone: c.whatsapp, label: `${c.name} (וואטסאפ: ${c.whatsapp})` });
      return phones;
    })
    // Remove duplicates and empty
    .filter((v, i, a) => v.phone && a.findIndex(t => t.phone === v.phone) === i);

  const handleAdd = (phone) => {
    if (!phone) return;
    if (recipients.includes(phone)) {
      setInputValue("");
      return;
    }
    onChange([...recipients, phone]);
    setInputValue("");
    setIsOpen(false);
  };

  const handleRemove = (phoneToRemove) => {
    onChange(recipients.filter(phone => phone !== phoneToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      // Basic phone validation (allow numbers, dashes, plus, spaces)
      if (/^[\d\+\-\s]{9,}$/.test(inputValue)) {
        handleAdd(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      handleRemove(recipients[recipients.length - 1]);
    }
  };

  const filteredClients = clientPhones.filter(c => 
    c.label.toLowerCase().includes(inputValue.toLowerCase()) && 
    !recipients.includes(c.phone)
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white min-h-[42px] focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 transition-all">
        {recipients.map((phone, idx) => (
          <Badge key={idx} variant="secondary" className="gap-1 pl-1 pr-2 py-1 text-sm font-normal bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
            <Smartphone className="w-3 h-3 opacity-50" />
            {phone}
            <button
              type="button"
              onClick={() => handleRemove(phone)}
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
                      key={client.phone + Math.random()}
                      className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        handleAdd(client.phone);
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                        <Smartphone className="w-3 h-3" />
                      </div>
                      <span>{client.label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              
              {inputValue && /^[\d\+\-\s]{9,}$/.test(inputValue) && !filteredClients.find(c => c.phone === inputValue) && (
                <div 
                  className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-green-600 border-t"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAdd(inputValue);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  הוסף מספר "{inputValue}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        הקלד מספר טלפון ולחץ Enter, או בחר מרשימת הלקוחות
      </p>
    </div>
  );
}