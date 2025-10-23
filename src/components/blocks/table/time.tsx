import { format, formatDistanceToNow } from "date-fns";

export default function TableItemTime({
  value,
  options,
  className,
}: {
  value: number;
  options?: any;
  className?: string;
}) {
  return (
    <div className={className}>
      {options?.format
        ? format(new Date(value), options?.format)
        : formatDistanceToNow(new Date(value), { addSuffix: true })}
    </div>
  );
}
