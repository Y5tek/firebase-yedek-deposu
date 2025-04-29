import React from 'react';

export default function NewRecordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout can add specific headers, footers, or context providers
  // relevant only to the new record creation flow.
  // For now, it just renders the children (the specific step page).
  return <>{children}</>;
}
