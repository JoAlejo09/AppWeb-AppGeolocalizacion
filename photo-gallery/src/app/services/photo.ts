import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo as CameraPhoto } from '@capacitor/camera';
import {Filesystem, Directory} from '@capacitor/filesystem';
import { Platform } from '@ionic/angular';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

public photos: UserPhoto[] = [];
private PHOTO_STORAGE: string = 'photos';
private LOCATIONS_FILE: string = 'locations.txt';
private platform: Platform;

  constructor(platform: Platform) { 
    this.platform = platform;
  }
  

//Va a capturar la foto y es independiente del sistema operativo
 public async addNewToGallery(){
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });
    let location: PhotoLocation | undefined;
    try{
      const pos = await Geolocation.getCurrentPosition();
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const mapsLink = `https://www.google.com/maps/@${lat},${lon}`;
      location = {lat,lon,mapsLink};
    }catch(e){
      console.warn('No se pudo obtener la localización',e);
    }

    const saveImageFile = await this.savePicture(capturedPhoto,location);
    this.photos.unshift(saveImageFile);

  await Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify([saveImageFile, ...this.photos])
    });
    await this.appendLocationToFile(saveImageFile);
  }

  private async savePicture(cameraPhoto: CameraPhoto,location?:PhotoLocation){
    const base64Data = await this.readAsBase64(cameraPhoto);
    const fileName = Date.now() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path:fileName,
      data: base64Data,
      directory: Directory.Data
    });
    if (this.platform.is('hybrid')){
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
        fileName,
        location
      };
    }else{
    return {
      filepath: fileName,
      webviewPath: cameraPhoto.webPath,
      fileName,
      location
    };
    }
  }
  private async readAsBase64(cameraPhoto: CameraPhoto){
    if (this.platform.is('hybrid')){
      const file = await Filesystem.readFile({
        path: cameraPhoto.path!
      });
      return file.data;
    }else{
    const response = await fetch(cameraPhoto.webPath!);
    const blob = await response.blob();
    return await this.convertBlobToBase64(blob) as string;
    }
  }
  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
        resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
  public async loadSaved(){
    const {value} = await Preferences.get({key: this.PHOTO_STORAGE});
    this.photos = (value ? JSON.parse(value) : []) as UserPhoto[];

    if(!this.platform.is('hybrid')){ 
      for (let photo of this.photos){
        const readFile = await Filesystem.readFile({
          path: photo.filepath,
          directory: Directory.Data
        });
        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }
  private async appendLocationToFile(photo: UserPhoto): Promise<void> {
    if (!photo.location) {
      return;
    }
    const line = `${photo.fileName ?? photo.filepath} | ${photo.location.lat},${photo.location.lon} | ${photo.location.mapsLink}\n`;
    try{
      const existing = await Filesystem.readFile({
        path: this.LOCATIONS_FILE,
        directory: Directory.Data
    });
    const previous = existing.data ?? '';
    const newData = previous + line;

    await Filesystem.writeFile({
      path: this.LOCATIONS_FILE,
      data: newData,
      directory: Directory.Data,
      recursive:true
    });
    }catch(e){
      await Filesystem.writeFile({
        path: this.LOCATIONS_FILE,
        data: line,
        directory: Directory.Data,
        recursive:true,
      });
    }
  }
  public async getLocationsFileContent(): Promise<string> {
    try{
      const file = await Filesystem.readFile({
        path: this.LOCATIONS_FILE,
        directory: Directory.Data
      });
      return file.data as string;
    }catch(e){
      return '';
    }
  }
}
export interface UserPhoto{
  filepath: string;
  webviewPath?: string;
  fileName?: string;
  location?: PhotoLocation;
}
export interface PhotoLocation {
  lat: number;
  lon: number;
  mapsLink: string;
}
