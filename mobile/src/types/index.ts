export interface AuthCredentials {
  siteUrl: string;
  apiKey: string;
  siteKey: string;
  contactId: string;
}

export interface ContactSummary {
  id: string;
  displayName: string;
  email?: string;
}

export interface GroupSummary {
  id: string;
  title: string;
  description?: string;
}

export interface GroupMessage {
  id: string;
  authorId: string;
  authorName: string;
  details: string;
  subject?: string;
  timestamp: string;
}
