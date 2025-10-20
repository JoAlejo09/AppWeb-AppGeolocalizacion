import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo as CameraPhoto} from '@capacitor/camera';
import {Filesystem, Directory} from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
public photos: UserPhoto[] = [];
  constructor() { }
  

//Va a capturar la foto y es independiente del sistema operativo
  async addNewToGallery(){
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });
    this.photos.unshift({
      filepath: 'soon...',
      webviewPath: capturedPhoto.webPath
    });
    console.log('Foto capturada',capturedPhoto);
    return capturedPhoto;
  }
}
export interface UserPhoto{
  filepath: string;
  webviewPath?: string;
}
