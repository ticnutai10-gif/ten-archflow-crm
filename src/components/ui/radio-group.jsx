import * as React from "react";

const RadioGroup = React.forwardRef(({ className, value, onValueChange, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="radiogroup"
      className={className}
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            checked: child.props.value === value,
            onCheckedChange: () => onValueChange && onValueChange(child.props.value)
          });
        }
        return child;
      })}
    </div>
  );
});

RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef(({ className, checked, onCheckedChange, value, id, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onCheckedChange}
      className={`h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-blue-600 border-blue-600' : 'bg-white'
      } ${className}`}
      {...props}
    >
      {checked && (
        <div className="w-2 h-2 rounded-full bg-white" />
      )}
    </button>
  );
});

RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };