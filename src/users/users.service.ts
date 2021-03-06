import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './user.schema';
import { Model, Types } from 'mongoose';
import { UpdateUserDto } from './dto/updateUser.dto';
import { Video, VideoDocument } from 'src/videos/video.schema';
import { FileTypes, MediaService } from 'src/media/media.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    private mediaService: MediaService,
  ) {}

  async getById(id: Types.ObjectId) {
    const userVideos = await this.videoModel.find({
      user: new Types.ObjectId(id),
    });
    const totalViews = userVideos.reduce((prev, curr) => prev + curr.views, 0);

    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.totalViews = totalViews;
    await user.save();

    return user;
  }

  async updateProfile(authId: Types.ObjectId, dto: UpdateUserDto) {
    const user = await this.userModel.findById(authId);
    if (!user) throw new NotFoundException('User not found');

    user.name = dto.name;
    user.description = dto.description;
    if (dto.country) user.country = dto.country;
    if (dto.banner) {
      const banner = await this.mediaService.image(dto.banner);
      user.banner = banner;
    }
    if (dto.avatar) {
      const avatar = await this.mediaService.image(dto.avatar);
      user.avatar = avatar;
    }
    await user.save();

    return user;
  }

  async getPopular() {
    const popular = await this.userModel
      .find({ subscribersCount: { $gt: 0 } })
      .select('name avatar subscribersCount')
      .sort({ subscribersCount: 'desc' })
      .limit(5);
    return popular;
  }

  async toggleSubscribe(userId: Types.ObjectId, authId: Types.ObjectId) {
    const authUser = await this.userModel.findById(authId);
    const candidate = await this.userModel.findById(userId);

    if (authUser.subscriptions.includes(candidate._id)) {
      authUser.subscriptions = authUser.subscriptions.filter(
        (id) => String(id) !== String(userId),
      );
      candidate.subscribersCount -= 1;
      candidate.subscribers = candidate.subscribers.filter(
        (id) => String(id) !== String(authId),
      );
    } else {
      authUser.subscriptions.push(userId);
      candidate.subscribersCount += 1;
      candidate.subscribers.push(authId);
    }

    await candidate.save();
    await authUser.save();
    return candidate._id;
  }
}
