import { Calendar, User } from 'lucide-react';

interface DocHeaderProps {
  title: string;
  description?: string;
  author?: string;
  date?: string;
}

export function DocHeader({ title, description, author, date }: DocHeaderProps) {
  return (
    <div className="mb-8 border-b border-border pb-8">
      <h1 className="text-4xl font-bold tracking-tight mb-4">{title}</h1>

      {description && (
        <p className="text-xl text-muted-foreground mb-4">{description}</p>
      )}

      {(author || date) && (
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {author && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{author}</span>
            </div>
          )}
          {date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={date}>{formatDate(date)}</time>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
