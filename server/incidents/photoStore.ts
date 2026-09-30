import { Binary, type Collection } from 'mongodb';

export type IncidentPhoto = {
  bytes: Buffer;
  fileName: string;
  mediaType: string;
};

export interface IncidentPhotoStore {
  save(reportReference: string, photo: IncidentPhoto): Promise<void>;
  find(reportReference: string): Promise<IncidentPhoto | null>;
  delete(reportReference: string): Promise<void>;
}

export type IncidentPhotoDocument = {
  reportReference: string;
  bytes: Binary;
  fileName: string;
  mediaType: string;
  updatedAt: Date;
};

export class MongoIncidentPhotoStore implements IncidentPhotoStore {
  constructor(private readonly photos: Collection<IncidentPhotoDocument>) {}

  async ensureIndexes() {
    await this.photos.createIndex(
      { reportReference: 1 },
      { name: 'report_reference_unique', unique: true },
    );
  }

  async save(reportReference: string, photo: IncidentPhoto) {
    await this.photos.replaceOne(
      { reportReference },
      {
        reportReference,
        bytes: new Binary(photo.bytes),
        fileName: photo.fileName,
        mediaType: photo.mediaType,
        updatedAt: new Date(),
      },
      { upsert: true },
    );
  }

  async find(reportReference: string): Promise<IncidentPhoto | null> {
    const photo = await this.photos.findOne({ reportReference });
    if (!photo) {
      return null;
    }
    return {
      bytes: Buffer.from(photo.bytes.buffer),
      fileName: photo.fileName,
      mediaType: photo.mediaType,
    };
  }

  async delete(reportReference: string) {
    await this.photos.deleteOne({ reportReference });
  }
}
