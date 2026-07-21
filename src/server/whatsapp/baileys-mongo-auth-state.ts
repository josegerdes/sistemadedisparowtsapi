import { Db, ObjectId } from "mongodb";
import {
  initAuthCreds,
  proto,
  BufferJSON,
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
} from "@whiskeysockets/baileys";

import { collections } from "@/server/db/collections";

/**
 * Adaptador de `AuthenticationState` do Baileys sobre o Mongo — porta do padrão de
 * `useMultiFileAuthState` (um arquivo por chave) do próprio Baileys, só que com
 * duas coleções em vez de arquivos: `baileysAuthCreds` (1 doc, credenciais de
 * identidade) e `baileysAuthKeys` (1 doc por chave de sessão/pre-key/sender-key,
 * que rotacionam constantemente). Serializa com o `BufferJSON` do próprio Baileys
 * pra preservar `Buffer`/`Uint8Array` corretamente — um dump JSON ingênuo
 * corromperia esses campos.
 */
export async function getMongoAuthState(
  db: Db,
  accountId: string
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const accountObjectId = ObjectId.createFromHexString(accountId);

  const existingCreds = await collections.baileysAuthCreds(db).findOne({ accountId: accountObjectId });
  const creds: AuthenticationCreds = existingCreds
    ? JSON.parse(existingCreds.creds, BufferJSON.reviver)
    : initAuthCreds();

  async function saveCreds() {
    const serialized = JSON.stringify(creds, BufferJSON.replacer);
    await collections.baileysAuthCreds(db).updateOne(
      { accountId: accountObjectId },
      { $set: { accountId: accountObjectId, creds: serialized, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async (type, ids) => {
        const docs = await collections
          .baileysAuthKeys(db)
          .find({ accountId: accountObjectId, keyType: type, keyId: { $in: ids } })
          .toArray();
        const result: Record<string, SignalDataTypeMap[typeof type]> = {};
        for (const doc of docs) {
          let value = JSON.parse(doc.value, BufferJSON.reviver);
          if (type === "app-state-sync-key" && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value);
          }
          result[doc.keyId] = value;
        }
        return result;
      },
      set: async (data) => {
        const operations: Promise<unknown>[] = [];
        for (const type of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
          const keys = data[type];
          if (!keys) continue;
          for (const keyId of Object.keys(keys)) {
            const value = keys[keyId];
            if (value == null) {
              operations.push(
                collections
                  .baileysAuthKeys(db)
                  .deleteOne({ accountId: accountObjectId, keyType: type, keyId })
              );
            } else {
              const serialized = JSON.stringify(value, BufferJSON.replacer);
              operations.push(
                collections.baileysAuthKeys(db).updateOne(
                  { accountId: accountObjectId, keyType: type, keyId },
                  { $set: { accountId: accountObjectId, keyType: type, keyId, value: serialized, updatedAt: new Date() } },
                  { upsert: true }
                )
              );
            }
          }
        }
        await Promise.all(operations);
      },
    },
  };

  return { state, saveCreds };
}

/** Apaga toda a sessão persistida de uma conta (logout de verdade — força novo QR). */
export async function clearMongoAuthState(db: Db, accountId: string): Promise<void> {
  const accountObjectId = ObjectId.createFromHexString(accountId);
  await Promise.all([
    collections.baileysAuthCreds(db).deleteOne({ accountId: accountObjectId }),
    collections.baileysAuthKeys(db).deleteMany({ accountId: accountObjectId }),
  ]);
}
