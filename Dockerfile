FROM ubuntu as stage

WORKDIR /usr/src
COPY ./helper/dockerSetup.sh /usr/src/dockerSetup.sh

RUN chmod +x /usr/src/dockerSetup.sh
RUN /usr/src/dockerSetup.sh