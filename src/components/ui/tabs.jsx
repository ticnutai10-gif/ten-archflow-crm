import * as React from "react";

const Tabs = React.forwardRef(({ defaultValue, value, onValueChange, children, className, ...props }, ref) => {
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleValueChange = (newValue) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
  };

  const enhanceChildren = (children) => {
    return React.Children.map(children, child => {
      if (!React.isValidElement(child)) return child;

      const isTabComponent = child.type?.displayName === 'TabsList' || 
                             child.type?.displayName === 'TabsContent' || 
                             child.type?.displayName === 'TabsTrigger';

      if (isTabComponent) {
        const childProps = { selectedValue, onValueChange: handleValueChange };
        if (child.props?.children) {
          return React.cloneElement(child, {
            ...childProps,
            children: enhanceChildren(child.props.children)
          });
        }
        return React.cloneElement(child, childProps);
      }

      if (child.props?.children) {
        return React.cloneElement(child, {
          children: enhanceChildren(child.props.children)
        });
      }

      return child;
    });
  };

  return (
    <div ref={ref} className={className} {...props}>
      {enhanceChildren(children)}
    </div>
  );
});

Tabs.displayName = "Tabs";

const TabsList = React.forwardRef(({ className, children, selectedValue, onValueChange, ...props }, ref) => (
  <div
    ref={ref}
    className={`inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500 ${className || ''}`}
    {...props}
  >
    {React.Children.map(children, child =>
      React.isValidElement(child)
        ? React.cloneElement(child, { selectedValue, onValueChange })
        : child
    )}
  </div>
));

TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef(({ className, children, value, selectedValue, onValueChange, ...props }, ref) => {
  const isSelected = selectedValue === value;

  return (
    <button
      ref={ref}
      type="button"
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isSelected
          ? 'bg-white text-slate-900 shadow-sm'
          : 'hover:bg-slate-200/50 hover:text-slate-900'
      } ${className || ''}`}
      onClick={() => onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  );
});

TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef(({ className, children, value, selectedValue, ...props }, ref) => {
  // תקן את הבעיה - השווה selectedValue שעובר מההורה ל-value של TabsContent
  const isSelected = selectedValue === value;

  if (!isSelected) return null;

  return (
    <div
      ref={ref}
      className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  );
});

TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };