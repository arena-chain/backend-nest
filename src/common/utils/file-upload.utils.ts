import { extname } from 'path';
import { HttpException, HttpStatus } from '@nestjs/common';
import { diskStorage } from 'multer';

export const imageUploadOptions = {
    fileFilter: (req: any, file: any, cb: any) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
            cb(null, true);
        } else {
            cb(new HttpException(`Unsupported file type ${extname(file.originalname)}`, HttpStatus.BAD_REQUEST), false);
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
