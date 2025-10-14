import { AuthCredentials, ContactSummary, GroupMessage, GroupSummary } from '../types';

type CiviResponse<T> = {
  is_error?: number;
  error_message?: string;
  values?: Record<string, T> | T[];
  count?: number;
};

type SingleResponse<T> = {
  is_error?: number;
  error_message?: string;
  values?: T;
  count?: number;
};

const ACTIVITY_TYPE = 'Text Message';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function extractFirstValue<T>(values?: Record<string, T> | T[]): T | undefined {
  if (!values) {
    return undefined;
  }

  if (Array.isArray(values)) {
    return values[0];
  }

  const firstKey = Object.keys(values)[0];
  return firstKey ? values[firstKey] : undefined;
}

export class CiviClient {
  private readonly credentials: AuthCredentials;
  private readonly baseUrl: string;
  private contactCache = new Map<string, ContactSummary>();

  constructor(credentials: AuthCredentials) {
    this.credentials = credentials;
    this.baseUrl = normalizeBaseUrl(credentials.siteUrl);
  }

  private buildBody(params: Record<string, unknown>): string {
    const body = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (typeof value === 'object') {
        body.append(key, JSON.stringify(value));
      } else {
        body.append(key, String(value));
      }
    });
    return body.toString();
  }

  private async request<T>(entity: string, action: string, params: Record<string, unknown> = {}): Promise<CiviResponse<T>> {
    const body = this.buildBody({
      entity,
      action,
      json: {
        sequential: 1,
        api_key: this.credentials.apiKey,
        key: this.credentials.siteKey,
        ...params
      }
    });

    const response = await fetch(`${this.baseUrl}/civicrm/ajax/rest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CiviCRM request failed (${response.status}): ${text}`);
    }

    const data: CiviResponse<T> = await response.json();
    if (data.is_error) {
      throw new Error(data.error_message || 'Unknown CiviCRM error');
    }

    return data;
  }

  async getContactSummary(contactId: string): Promise<ContactSummary> {
    if (this.contactCache.has(contactId)) {
      return this.contactCache.get(contactId)!;
    }

    const data = await this.request<{ id: string; display_name: string; email?: string }>('Contact', 'get', {
      id: contactId,
      return: ['display_name', 'email']
    });

    const contact = extractFirstValue(data.values);
    if (!contact) {
      throw new Error(`Contact ${contactId} was not found`);
    }

    const summary: ContactSummary = {
      id: contact.id,
      displayName: contact.display_name,
      email: contact.email ?? undefined
    };

    this.contactCache.set(contactId, summary);
    return summary;
  }

  async getGroupMembership(contactId: string): Promise<GroupSummary[]> {
    const data = await this.request<{
      id: string;
      group_id: string;
      group_title?: string;
      group_description?: string;
    }>('GroupContact', 'get', {
      contact_id: contactId,
      status: 'Added',
      'return': ['group_id', 'group_title', 'group_description']
    });

    return Object.values(data.values ?? {}).map((value) => ({
      id: String(value.group_id),
      title: value.group_title ?? `Group ${value.group_id}`,
      description: value.group_description
    }));
  }

  async getGroupMembers(groupId: string): Promise<string[]> {
    const data = await this.request<{
      contact_id: string;
    }>('GroupContact', 'get', {
      group_id: groupId,
      status: 'Added',
      'return': ['contact_id']
    });

    return Object.values(data.values ?? {}).map((value) => String(value.contact_id));
  }

  async getGroupMessages(groupId: string): Promise<GroupMessage[]> {
    const data = await this.request<{
      id: string;
      details?: string;
      subject?: string;
      activity_date_time: string;
      source_contact_id: string;
    }>('Activity', 'get', {
      source_record_id: groupId,
      source_record_table: 'civicrm_group',
      activity_type_id: ACTIVITY_TYPE,
      'return': ['id', 'details', 'subject', 'activity_date_time', 'source_contact_id'],
      options: {
        sort: 'activity_date_time ASC',
        limit: 250
      }
    });

    return Object.values(data.values ?? {}).map((value) => ({
      id: String(value.id),
      details: value.details ?? '',
      subject: value.subject,
      timestamp: value.activity_date_time,
      authorId: String(value.source_contact_id),
      authorName: ''
    }));
  }

  async hydrateAuthorNames(messages: GroupMessage[]): Promise<GroupMessage[]> {
    const uniqueAuthorIds = Array.from(new Set(messages.map((message) => message.authorId)));
    const enriched = await Promise.all(
      uniqueAuthorIds.map(async (authorId) => {
        try {
          const summary = await this.getContactSummary(authorId);
          return [authorId, summary.displayName] as const;
        } catch (error) {
          console.warn('Unable to fetch contact summary', error);
          return [authorId, 'Unknown contact'] as const;
        }
      })
    );

    const nameMap = new Map<string, string>(enriched);
    return messages.map((message) => ({
      ...message,
      authorName: nameMap.get(message.authorId) ?? message.authorName
    }));
  }

  async sendGroupMessage(groupId: string, message: string, targetContactIds: string[]) {
    const response = await this.request<SingleResponse<unknown>>('Activity', 'create', {
      source_contact_id: this.credentials.contactId,
      source_record_id: groupId,
      source_record_table: 'civicrm_group',
      activity_type_id: ACTIVITY_TYPE,
      subject: message.slice(0, 60),
      details: message,
      target_contact_id: targetContactIds.join(',')
    });

    return response;
  }
}

export const GROUP_MESSAGE_ACTIVITY_TYPE = ACTIVITY_TYPE;
