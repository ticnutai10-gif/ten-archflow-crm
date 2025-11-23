import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/components/utils/useMediaQuery';

export function ResponsiveTable({ 
  data = [], 
  columns = [], 
  onRowClick,
  mobileCardRenderer,
  className = ""
}) {
  const isMobile = useIsMobile();

  if (isMobile && mobileCardRenderer) {
    return (
      <div className={`space-y-3 ${className}`}>
        {data.map((row, index) => (
          <Card 
            key={index} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onRowClick?.(row)}
          >
            <CardContent className="p-4">
              {mobileCardRenderer(row)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className={`space-y-3 ${className}`}>
        {data.map((row, index) => (
          <Card 
            key={index}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onRowClick?.(row)}
          >
            <CardContent className="p-4 space-y-2">
              {columns.map((column) => (
                <div key={column.key} className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">
                    {column.label}:
                  </span>
                  <span className="text-sm text-slate-900 text-left">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className={className}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.headerClassName}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow 
              key={index}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.cellClassName}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}