import { Controller, Get, HttpException, Post, Headers, HttpStatus } from '@nestjs/common';
import {
  Body,
  Delete,
  Ip,
  Param,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common/decorators';
import * as iconv from 'iconv-lite';
import { MyBotsService } from './bots.service';
import { BotCreate, BotUpdateDataSource, CreateConversationDto } from './dtos/mybots.dto';

import { User } from '../decorators/user.decorator';
import { ChatSessionId } from '../decorators/chatSession.decorator';
import { Request, Response } from 'express';

import { FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { cwd } from 'process';
import { chownSync, copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmdirSync, unlinkSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { error } from 'console';
import { S3Service } from 'src/infrastructure/s3/s3.service';

@Controller({
  path: 'mybots',
  version: '1',
})
export class MyBotsController {
  constructor(
    private readonly mybotsServices: MyBotsService,
    private readonly s3Service: S3Service, 
  ) {}
  @Post('/create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 7, {
      storage: multer.diskStorage({
        destination: function (req, file, cb) {
          const destinationPath = `${cwd()}/uploads/tmp`;

          if (!existsSync(destinationPath)) {
            try {
              mkdirSync(destinationPath, { recursive: true }); // Ensure parent directories are created
            } catch (err) {
              return cb(err);
            }
          }

          cb(null, destinationPath);
        },
        filename: function (req, file, cb) {
          const originalName = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8');
          cb(null, originalName);
        },
      }),
    }),
  )
  async createBots(
    @UploadedFiles() files: any,
    @Body() botsDTO: BotCreate,
    @User() user?: any,
  ) {
    if (typeof botsDTO.urls === 'string') {
      try {
        botsDTO.urls = JSON.parse(botsDTO.urls);
      } catch (err) {
        throw new error('Invalid JSON format for urls');
      }
    };

    if (typeof botsDTO.qANDa_input === 'string') {
      try {
        botsDTO.qANDa_input = JSON.parse(botsDTO.qANDa_input);
      } catch (err) {
        throw new error('Invalid JSON format for urls');
      }
    }

    const createdBot = await this.mybotsServices.cretaeBots(user?.user_id);
    const data = {
      ...botsDTO,
      bot_id: createdBot.bot_id,
    };

    if (files?.length) {
      // Rename the uploaded files directory
      renameSync(
        `${cwd()}/uploads/tmp`,
        `${cwd()}/uploads/${createdBot.bot_id}`,
      );
  
      const fileUrlPrefix =
        process.env.IMAGE_URL_PREFIX || 'http://localhost:12000';
  
      // Create file information including link, size, and name
      const filesInfo = files.map(file => {
        const originalName = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8');
        return {
          link: `${fileUrlPrefix}/uploads/${createdBot.bot_id}/${originalName}`,
          size: file.size,
          name: originalName,
        };
      });
  
      // Update data object with files_info
      data['files_info'] = filesInfo;
      data['static_files'] = filesInfo.map(file => file.link);
    }
  

    const createdDataSource = await this.mybotsServices.createDataSource(data);

    return createdDataSource;
  };




  @Get('/list')
  @UseGuards(JwtAuthGuard)
  async getAllBots(
    @Query('page') pageNumber?: number,
    @Query('itemsPerPage') itemsPerPage?: number,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @User() user?: any,
  ) {
    return await this.mybotsServices.getAllBots(
      pageNumber,
      itemsPerPage,
      type,
      search,
      user.user_id,
    );
  };
  @Get('/count')
  @UseGuards(JwtAuthGuard)
  async countBots(@User() user: any) {
    try {
      const count = await this.mybotsServices.countBots(user.user_id);
      return { count };
    } catch (error) {
      throw new HttpException('Failed to retrieve bot count', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post("/dataSource/update/:bot_id")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 7, {
      storage: multer.diskStorage({
        destination: function (req, file, cb) {
          const destinationPath = `${cwd()}/uploads/tmp`;

          if (!existsSync(destinationPath)) {
            try {
              mkdirSync(destinationPath, { recursive: true }); // Ensure parent directories are created
            } catch (err) {
              return cb(err);
            }
          }

          cb(null, destinationPath);
        },
        filename: function (req, file, cb) {
          const originalName = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8');
          cb(null, originalName);
        },
      }),
    }),
  )
  async updateDataSource(
    @UploadedFiles() files: any,
    @Body() botsDTO: BotUpdateDataSource,
    @User() user?: any,
    @Param('bot_id') botId?:string
    
  ){
    if (typeof botsDTO.urls === 'string') {
      try {
        botsDTO.urls = JSON.parse(botsDTO.urls);
      } catch (err) {
        throw new error('Invalid JSON format for urls');
      }
    };

    if (typeof botsDTO.qANDa_input === 'string') {
      try {
        botsDTO.qANDa_input = JSON.parse(botsDTO.qANDa_input);
      } catch (err) {
        throw new error('Invalid JSON format for urls');
      }
    };


    const { uploadedFile: uploadedFileStr, ...data } = botsDTO;
    
   
    const result = await this.mybotsServices.findeDataSource(botId,user.user_id);
    let static_files = result.static_files;
    let files_info = result.files_info;

    // step 1 (check file delted ):
    let uploadedFile = [];
      if (botsDTO.uploadedFile) {
          uploadedFile = JSON.parse(botsDTO.uploadedFile);
          console.log(uploadedFile)
      }
      if(uploadedFile.length > 0){
        for (const file of uploadedFile) {
          const { url, fileName, remove } = file;
          
          // // Check if file needs to be removed
          if (remove === "true" || remove==true) {
            try {
              // Construct the file path
              const filePath = `${cwd()}/uploads/${botId}/${fileName}`;
    
              // Check if file exists and delete it
              if (existsSync(filePath)) {
                unlinkSync(filePath);
              }
            } catch (error) {
              throw new HttpException(`Failed to delete file ${fileName}`, 500);
            }
          }
        };
        static_files = static_files.filter(url => {
          const uploaded = uploadedFile.find(upFile => upFile.url === url);
          return !(uploaded && (uploaded.remove == "true" || uploaded.remove == true));
        });
        files_info = files_info.filter(fileInfo => {
          const uploaded = uploadedFile.find(upFile => upFile.fileName === fileInfo.name);
          return !(uploaded && (uploaded.remove == "true" || uploaded.remove == true));
        });

        data['static_files'] = static_files;
        data['files_info'] = files_info;


      };
      data['static_files'] = data['static_files'] || [];
      if (files?.length > 0) {
          const targetDir = `${cwd()}/uploads/${botId}`;
          if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
          }
          
          const tempDir = `${cwd()}/uploads/tmp`;
          const tempFiles = readdirSync(tempDir);
      
          for (const file of tempFiles) {
            const tempFilePath = `${tempDir}/${file}`;
            const targetFilePath = `${targetDir}/${file}`;
            copyFileSync(tempFilePath, targetFilePath);
            unlinkSync(tempFilePath); 
          };

         rmdirSync(tempDir, { recursive: true });

          const fileUrlPrefix =
          process.env.IMAGE_URL_PREFIX || 'http://localhost:12000';
          const fileLinks = files.map(file => {
            const originalName = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8');
            return `${fileUrlPrefix}/uploads/${botId}/${originalName}`;
          });
          const newFilesInfo = files.map(file => {
            const originalName = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8');
            return {
              link: `${fileUrlPrefix}/uploads/${botId}/${file.originalname}`,
              size: file.size,
              name: originalName
            };
          });
          data['static_files'] = [...data['static_files'],...fileLinks];
          data['files_info'] = [...files_info, ...newFilesInfo];

      };
       
        const updatedDataSource=await this.mybotsServices.updateDataSource(data,result.datasource_id);
        await this.mybotsServices.incrementUpdateDataSource(botId,user.user_id);
        return updatedDataSource;

       
  }


  @Get('/dataSource/:bot_id')
  @UseGuards(JwtAuthGuard)
  async getDataSourceBot(@Param('bot_id') botId: string,@User() user: any){
    try {
      const result = await this.mybotsServices.findeDataSource(botId,user.user_id);
      if (!result) {
        throw new HttpException('DataSource not found ...', 404);
      }
      return result;
    } catch (error) {
      throw new HttpException('Failed to get your DataSource', 500);
    }

  };

  @Get('/configs/:bot_id')
  @UseGuards(JwtAuthGuard)
  async getCinfigsBot(@Param('bot_id') botId: string,@User() user: any){
    try {
      const result = await this.mybotsServices.findeConfigs(botId,user.user_id);
      if (!result) {
        throw new HttpException('configs not found ...', 404);
      }
      return result;
    } catch (error) {
      throw new HttpException('Failed to get your configs', 500);
    }

  };

@Post('/configs/updateGeneral/:bot_id')
@UseGuards(JwtAuthGuard)
async updateGeneralConfig(
  @Param('bot_id') botId: string,
  @User() user: any,
  @Body() updateData: { name: string },
) {
  try {
    const result = await this.mybotsServices.updateGeneralConfig(botId, user.user_id, updateData);
    if (!result) {
      throw new HttpException('Update failed', 404);
    }
    return result;
  } catch (error) {
    throw new HttpException('Failed to update your configs', 500);
  }
};

@Post('/configs/updateModel/:bot_id')
@UseGuards(JwtAuthGuard)
async updateModelConfig(
  @Param('bot_id') botId: string,
  @User() user: any,
  @Body() updateData: { model_name: string,Temperature:number },
) {
  try {
    const result = await this.mybotsServices.updateModelConfig(botId, user.user_id, updateData);
    if (!result) {
      throw new HttpException('Update failed', 404);
    }
    return result;
  } catch (error) {
    throw new HttpException('Failed to update your configs', 500);
  }
};

@Post('/configs/updateUi/:bot_id')
@UseGuards(JwtAuthGuard)
async updateUiConfig(
  @Param('bot_id') botId: string,
  @User() user: any,
  @Body() updateData:any,
) {
  try {
    const result = await this.mybotsServices.updateUiConfig(botId, user.user_id, updateData);
    if (!result) {
      throw new HttpException('Update failed', 404);
    }
    return result;
  } catch (error) {
    throw new HttpException('Failed to update your configs', 500);
  }
};
@Post('/configs/updateSecurity/:bot_id')
@UseGuards(JwtAuthGuard)
async updateSecurityConfig(
  @Param('bot_id') botId: string,
  @User() user: any,
  @Body() updateData:any,
) {
  try {
    const result = await this.mybotsServices.updateSecurityConfig(botId, user.user_id, updateData);
    if (!result) {
      throw new HttpException('Update failed', 404);
    }
    return result;
  } catch (error) {
    throw new HttpException('Failed to update your configs', 500);
  }
};


  @Post(':botId/conversations')
  async createConversation(
    @Param('botId') botId: string,
    @Body() createConversationDto: CreateConversationDto,
    @ChatSessionId() sessionId: string,
    @Ip() userIP,
    @Res() res: Response,
  ) {
    const widgetVersion = createConversationDto.widgetVersion;
    //const userLocation = await this.getUserLocation(userIP); // Function to fetch user location from IP

    let currentSessionId = sessionId;
    let createConversation: {
      sessionId: string;
      conversationId: string;
    };
    if (!currentSessionId) {
      currentSessionId = uuidv4();
      createConversation = await this.mybotsServices.createConversation({
        botId,
        widgetVersion,
        sessionId: currentSessionId,
        userIP,
      });
      const oneDayMaxAge = 24 * 60 * 60 * 1000;
      res.cookie('session_id', currentSessionId, { maxAge: oneDayMaxAge });
    }

    return res.json({ conversationId: createConversation?.conversationId });
  }

  // @UseGuards(JwtAuthGuard)
  @Get(':botId/conversations')
  async getBotConversations(@Param('botId') botId: string, @Query('filter') filter?: any ) {
    return this.mybotsServices.getConversations(botId,"",filter);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':botId/conversations/:conversationId')
  async getBotConversationById(
    @Param('botId') botId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.mybotsServices.getConversations(botId, conversationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('list/:bot_id')
  async getBot(@Param('bot_id') botId: string, @User() user: any) {
    try {
      const result = await this.mybotsServices.findeBot(botId, user.user_id);
      if (!result) {
        throw new HttpException('Bot not found', 404);
      }
      return result;
    } catch (error) {
      throw new HttpException('Failed to get your bot', 500);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/delete/:bot_id')
  async deleteBot(@Param('bot_id') botId: string, @User() user: any) {
    try {
      const result = await this.mybotsServices.deleteBot(botId, user.user_id);
      if (result) {
        return { message: 'Bot deleted successfully' };
      } else {
        throw new HttpException('Bot not found or not authorized', 404);
      }
    } catch (error) {
      throw new HttpException('Failed to delete bot', 500);
    }
  }
}
