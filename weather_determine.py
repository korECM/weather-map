import json
import os
from datetime import datetime

import boto3
import numpy as np
from botocore.exceptions import NoCredentialsError
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image


# Define the lambda handler function
def lambda_handler(event, context):
    # Parse the event data
    print(f"event : {event}")
    body = json.loads(event['body'])
    targets = body['targets']
    model_name = body['modelName']
    time = body['time']

    # Initialize AWS services clients
    s3_client = boto3.client('s3')
    dynamodb = boto3.resource('dynamodb')

    # Specify the DynamoDB table
    table = dynamodb.Table('weather-cctv')

    # The S3 bucket where the models are stored
    model_bucket_name = 'weather-colab-storage'
    image_bucket_name = 'weather-cctv-image-ecm'
    model_key = f'model/{model_name}.h5'

    # Download the model from S3
    try:
        model_path = f'/tmp/{model_name}.h5'
        print(f"download model {model_name} start")
        s3_client.download_file(model_bucket_name, model_key, model_path)
        print("downloaded")
    except NoCredentialsError:
        print("Credentials not available")
        return {
            'statusCode': 500,
            'body': json.dumps('Error downloading the model from S3')
        }

    # Load the model
    print("load model start")
    model = load_model(model_path)
    print("load model finish")

    # Process each target
    for target in targets:
        cctv_name = target['cctvName']
        coord_x = target['coordx']
        coord_y = target['coordy']
        image_key = target['imageKey']

        # Download the image from S3
        try:
            image_path = f'/tmp/{os.path.basename(image_key)}'
            print(f"download image {image_bucket_name} {image_key} start to {image_path}")
            s3_client.download_file(image_bucket_name, image_key, image_path)
            print("downloaded")
        except NoCredentialsError:
            print("Credentials not available")
            continue

        # Preprocess the image and prepare it for classification
        print("preprocess image")
        img = image.load_img(image_path, target_size=(224, 224))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) / 255.0
        print("preprocess image finish")

        # Predict the weather condition
        print("predict weather")
        prediction = model.predict(img_array)
        weather = 'sunny' if prediction[0][0] > 0.5 else 'rainy'
        print(f"predict weather finish : {weather}")

        # Store the result in DynamoDB
        response = table.put_item(
            Item={
                'key': f'{cctv_name}_{model_name}',
                'cctvName': cctv_name,
                'coordX': str(coord_x),
                'coordY': str(coord_y),
                'imageKey': image_key,
                'weather': weather,
                'time': time,
                'model': model_name,
                'processedTime': datetime.now().isoformat()
            }
        )
        print(f"put item {cctv_name} : {response}")

    # Return a successful response
    return {
        'statusCode': 200,
        'body': json.dumps('Processing complete')
    }
