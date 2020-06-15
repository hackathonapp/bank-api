# hackathon-cloudfive

[![LoopBack](<https://github.com/strongloop/loopback-next/raw/master/docs/site/imgs/branding/Powered-by-LoopBack-Badge-(blue)-@2x.png>)](http://loopback.io/)

## Setup MongoDB

    $ docker run --name mongodb \
    --publish 27017:27017 --expose=27017 \
    -e MONGO_INITDB_ROOT_USERNAME=admin \
    -e MONGO_INITDB_ROOT_PASSWORD=admin \
    -e MONGO_INITDB_USERNAME=user \
    -e MONGO_INITDB_PASSWORD=password \
    -e MONGO_INITDB_DATABASE=hackathon \
    --hostname MONGODB --detach --rm mongo

To manually setup your database, execute this in your mongodb container

    $ mongo -u admin -p admin

    > use hackathon
    > db.createUser({
        user: "user",
        pwd: passwordPrompt(),
        roles: [ "readWrite", "dbAdmin" ]
      })

## Setup Redis

    $ docker run --name redis \
    --publish 6379:6379 --expose 6379 \
    --hostname REDISIO --rm --detach redis /bin/sh -c 'redis-server --appendonly yes --requirepass password'

Build your container application

    $ docker build -t {{{container_name}}}:{{{tag}}} .

Create an environment file, see sample.env file

    docker run --name bank-api --publish 3000:3000 \
    --env-file .env --rm --detach {{{container_name}}}:{{{tag}}}

## Dependency MAX-OCR

    $ docker run --name max-ocr \
    --publish 5000:5000 --expose 5000 \
    --hostname MAXOCR --rm --detach codait/max-ocr
