const MusicModel = require('../database/music');
const dynamoose = require('dynamoose');
const uuid = require('uuid');

class Dynamoose{
    constructor(){
        this.getMusic = async (id) => {
            const music = await MusicModel.scan({'id':id}).exec();
            return music[0];
        }

        this.createMusic = (Artist, songTitle, info, actv, idx) => {
            return new Promise((resolve, reject) => {
                MusicModel.scan({'Artist':Artist, 'songTitle':songTitle}).exec((scanerr, result) => {
                    if(!scanerr){
                        if(result.count == 0){
                            MusicModel.create({'dummy':0, 'd2':result.scannedCount.toString(), 'id':uuid.v4(), 'Artist':Artist, 'songTitle':songTitle, 'info':info, 'actv':actv, 'idx':idx}, (creerr)=>{
                                if(creerr){
                                    return reject(creerr);
                                } else {
                                    return resolve(true);
                                }
                            });
                        } else {
                            return reject(new Error('Duplicated Data'));
                        }
                    } else {
                        return reject(scanerr);
                    }
                });
            });
        }

        this.updateMusic = async (id, Artist, songTitle, info, actv, idx) => {
            let entity, music;
            let setVal = {};
            if(Artist) setVal['Artist'] = Artist;
            if(songTitle) setVal['songTitle'] = songTitle;
            if(info) setVal['info'] = info;
            if(actv != null) setVal['actv'] = actv;
            if(idx) setVal['idx'] = idx;
            try{
                entity = await MusicModel.scan({'id':id}).exec();
                if(entity.count > 0){
                    // test01-music 테이블용
                    //music = await MusicModel.update({'id':id}, {"$SET": setVal});

                    // test01-music2 테이블용
                    music = await MusicModel.update({'dummy':0, 'd2':entity[0].d2}, {"$SET": setVal});
                    return true;
                } else {
                    return new Error('No data found');
                }
            } catch(err) {
                console.error(err);
                return false;
            }
        }

        this.removeMusic = async (id) => {
            let entity;
            try{
                entity = await MusicModel.scan({'id':id}).exec();
                console.log(entity);
                if(entity.count > 0){
                    // test01-music 테이블용
                    //await MusicModel.delete(entity[0].id);

                    // test01-music2 테이블용
                    await MusicModel.delete({'dummy':0, 'd2':entity[0].d2});
                    return true;
                } else {
                    return new Error("No data found");
                }
            } catch(err){
                console.error(err);
                return false;
            }
        }

        this.searchMusic = async (Artist, songTitle, info, actv, idx, settings) => {
            let music, srchType = {};
            let input = {"Artist":Artist, "songTitle":songTitle, "info":info, "actv":actv, "idx":idx};
            if(input != null){
                for(let item in input){
                    if(item == 'info'){
                        for(let it in input[item]){
                            if(settings != null){
                                if(settings.and || settings.and == null){
                                    srchType['info.' + it] = input[item][it];
                                } else {
                                    music = music != null ? music.or().where('info.' + it).eq(input[item][it]) : MusicModel.scan('info.' + it).eq(input[item][it]);
                                } 
                            } else {
                                srchType['info.' + it] = input[item][it];
                            }
                        }   
                    } else {
                        if(settings != null){
                            if(settings.and || settings.and == null){
                                if(input[item] != null) srchType[item] = input[item];
                            } else {
                                if(input[item] != null) music = music ? music.or().where(item).eq(input[item]) : MusicModel.scan(item).eq(input[item]);
                            }
                        } else {
                            if(input[item] != null) srchType[item] = input[item];
                        }
                    }
                }

                if(settings != null){
                    music = settings.and || settings.and == null ? await MusicModel.scan(srchType).exec() : (music ? await music.exec() : await MusicModel.scan.exec());
                } else {
                    music = await MusicModel.scan(srchType).exec();
                }
            } else {
                music = await MusicModel.scan().exec();
            }
       
            if(settings != null){
                if(settings.dir != null && settings.stype != null){
                    music.sort((a, b) => {
                        return settings.dir == 'ASC' ? (a[settings.stype] > b[settings.stype] ? 1 : -1) : (a[settings.stype] < b[settings.stype] ? 1 : -1);
                    });
                }

                if(settings.page != null){
                    let temp = new Array();
                    let endIndex = music.length > settings.page * 5 ? settings.page * 5 : music.length;
                    for(let i = (settings.page - 1) * 5 ; i < endIndex  ; i++){
                        temp.push(music[i]);
                    }
                    music = temp;
                }
            }

            return music;
        }

        this.queryMusic = async (Artist, songTitle, info, actv, idx, settings) => {
            let music = await MusicModel.query("dummy").eq(0);
            let cond = new dynamoose.Condition();
            let input = {"Artist":Artist, "songTitle":songTitle, "info":info, "actv":actv, "idx":idx};
            for(let item in input){
                if(item == 'info'){
                    for(let it in input[item]){
                        if(settings != null){
                            if(input[item][it] != null) settings.and || settings.and == null ? music.and().where('info.' + it).eq(input[item][it]) : cond.or().where('info.' + it).eq(input[item][it]);
                        } else {
                            if(input[item][it] != null) music.and().where('info.' + it).eq(input[item][it]);
                        }
                    }
                } else {
                    if(settings != null){
                        if(input[item] != null) settings.and || settings.and == null ? music.and().where(item).eq(input[item]) : cond.or().where(item).eq(input[item]);
                    } else {
                        if(input[item] != null) music.and().where(item).eq(input[item]);
                    }
                }
            }
            if(cond.settings.conditions.length > 0) music.and().parenthesis(cond);
            
            music = await music.exec();
            
            if(settings != null){
                if(settings.dir != null && settings.stype != null){
                    music.sort((a, b) => {
                        return settings.dir == 'ASC' ? (a[settings.stype] > b[settings.stype] ? 1 : -1) : (a[settings.stype] < b[settings.stype] ? 1 : -1);
                    });
                }
                if(settings.page != null){
                    let temp = new Array();
                    let endIndex = music.length > settings.page * 5 ? settings.page * 5 : music.length;
                    for(let i = (settings.page - 1) * 5 ; i < endIndex  ; i++){
                        temp.push(music[i]);
                    }
                    music = temp;
                }
            }
            
            return music;
        }
    }
}

module.exports = {Dynamoose};