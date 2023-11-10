const AWS = require('aws-sdk');
const {spawnSync} = require('child_process');
const {readFileSync, unlinkSync, createWriteStream} = require('fs');
const axios = require('axios');


const s3 = new AWS.S3();

const downloadFile = async (url, filepath) => {
    try {
        const response = await axios({
            method: 'GET', url: url, responseType: 'stream'
        });

        const writer = response.data.pipe(createWriteStream(filepath));

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        unlinkSync(filepath); // If there's an error, remove the file
        throw error;
    }
};


module.exports.handler = async (event) => {
    console.log(event.body)
    const {url: videoUrl, name, coordX, coordY} = JSON.parse(event.body);
    const videoFilePath = '/tmp/video.mp4';
    const frameFilePath = '/tmp/frame.jpg';
    const lambdaUrl = 'https://5baxwtrxxnuwimajbnukkxhlde0bifoe.lambda-url.ap-northeast-2.on.aws/';


    try {
        // Download the video file
        await downloadFile(videoUrl, videoFilePath);

        // Extract the 5th frame using ffmpeg
        const ffmpegResult = spawnSync('/opt/bin/ffmpeg', ['-i', videoFilePath, '-vf', 'select=eq(n\\,4)', '-vframes', '1', frameFilePath], {
            stdio: 'inherit',
            encoding: 'utf-8'
        });

        if (ffmpegResult.status === 0) {
            console.log('ffmpeg executed successfully.');
            console.log('stdout:', ffmpegResult.stdout);
        } else {
            console.error('ffmpeg failed with status', ffmpegResult.status);
            console.error('stderr:', ffmpegResult.stderr);
            console.error('stderr:', ffmpegResult);
        }

        // Read the frame file
        const frameFileBuffer = readFileSync(frameFilePath);

        const now = Date.now();

        // Upload the frame to S3
        const key = `${name}_${now}.jpg`;

        const uploadResult = await s3.putObject({
            Bucket: 'weather-cctv-image-ecm',
            Key: key,
            Body: frameFileBuffer,
            ContentType: 'image/jpeg'
        }).promise();

        console.log('Upload success:', uploadResult);

        await Promise.all(["resnet50", "resnet50v2", "resnet101", "resnet101v2"].map(async modelName => {
            await axios.post(lambdaUrl, {
                targets: [
                    {
                        cctvName: name,
                        coordx: coordX,
                        coordy: coordY,
                        imageKey: key,
                    }
                ],
                modelName: modelName,
                time: now
            })
        }))

        console.log('Determine Success');

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        // Cleanup: delete local files
        unlinkSync(videoFilePath);
        if (readFileSync(frameFilePath)) {
            unlinkSync(frameFilePath);
        }
    }
};
