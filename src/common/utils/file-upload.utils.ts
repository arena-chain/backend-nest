import { extname, join } from 'path';
import { HttpException, HttpStatus } from '@nestjs/common';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';

export const imageUploadOptions = {
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      cb(null, true);
    } else {
      cb(
        new HttpException(
          `Unsupported file type ${extname(file.originalname)}`,
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
  },
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const name = file.originalname.split('.')[0];
      const fileExtName = extname(file.originalname);
      const randomName = Array(4)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');
      cb(null, `${name}-${randomName}${fileExtName}`);
    },
  }),
};

export const videoUploadOptions = {
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new HttpException(
          `Unsupported video type ${extname(file.originalname)}`,
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
  },
  storage: diskStorage({
    destination: (req, file, cb) => {
      const dir = join(process.cwd(), 'uploads', 'videos');
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const fileExtName = extname(file.originalname);
      const randomName = Array(8)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');
      cb(null, `${Date.now()}-${randomName}${fileExtName}`);
    },
  }),
};
