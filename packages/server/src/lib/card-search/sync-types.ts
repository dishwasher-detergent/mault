export interface SyncSourceCard {
  id: string;
  name: string;
  setCode: string;
  imageUrl: string | undefined;
}

export interface SyncSourceCardDetail {
  name: string;
  setCode: string;
  imageUrl: string | undefined;
}

export interface SyncSource {
  gameKey: string;
  label: string;
  defaultUrl: string;
  fetchHeaders: Record<string, string>;
  languages: string[];
  fetchCards(
    baseUrl: string,
    addLog: (msg: string) => void,
    lang?: string,
    signal?: AbortSignal,
  ): Promise<SyncSourceCard[]>;
  fetchOne(
    id: string,
    baseUrl: string,
    lang: string,
  ): Promise<SyncSourceCardDetail | null>;
}
