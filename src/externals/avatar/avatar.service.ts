import { Injectable } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AvatarService {
  private readonly configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  AvatarS3Instance(): S3Client {
    return new S3Client({
      endpoint: this.configService.get('avatar.endpoint'),
      region: this.configService.get('avatar.region'),
      credentials: {
        accessKeyId: this.configService.get('avatar.accessKey'),
        secretAccessKey: this.configService.get('avatar.secretKey'),
      },
      forcePathStyle:
        this.configService.get('avatar.forcePathStyle') === 'true',
    });
  }

  async checkBucket(timeoutMs = 1000) {
    const bucket = this.configService.get<string>('avatar.bucket');
    const client = this.AvatarS3Instance();
    const start = Date.now();
    const head = client.send(
      new HeadBucketCommand({ Bucket: bucket })
    );

    const timer = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs),
    );

    try {
      await Promise.race([head, timer]);
      return { status: 'ok', ping: Date.now() - start };
    } catch (err: any) {
      return { status: 'error', error: err?.message || String(err) };
    }
  }

  async getDownloadUrl(avatarKey: string): Promise<string> {
    const s3Client = this.AvatarS3Instance();
    const bucket = this.configService.get<string>('avatar.bucket');
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: avatarKey,
      }),
      {
        expiresIn: 24 * 3600,
      },
    );

    const endpointRewrite = this.configService.get<string>(
      'avatar.endpointForSignedUrls',
    );
    if (endpointRewrite) {
      const avatarEndpoint = this.configService.get<string>('avatar.endpoint');
      return url.replace(avatarEndpoint, endpointRewrite);
    } else {
      return url;
    }
  }
}
