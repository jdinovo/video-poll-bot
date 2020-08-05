const got = require('got');
const FileType = require('file-type');

module.exports = {
    async getFileTypeFromUrl(url) {

        try{
            //get file stream
            const stream = got.stream(`${url}`);
    
            // get file type
            const type = await FileType.fromStream(stream);

            // return file type
            return type;
        } catch(e) {
            console.log('file/url not valid\n' + e);
        }
    }
}