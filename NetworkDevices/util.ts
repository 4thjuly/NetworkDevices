

declare var Uri: any;

namespace Util {

    export class Device {
        // location: string;
        manufacturer: string;
        model: string;
        friendlyName: string;
        // ip: any;
        presentationUrl: string;
        //endpointReference: string;
        hasSettings: boolean;

        constructor(public location: string, public ip: any, public endpointReference?: string) { }

    }

    export function getXmlDataForTag(xml, tagName) {
        var elements = xml.getElementsByTagName(tagName);
        if (elements && elements.length > 0) {
            var childNodes = elements[0].childNodes;
            if (childNodes && childNodes.length > 0) {
                return childNodes[0].data;
            }
        }
    }

    export function createNewUuid() {
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return uuid;
    }

    //function createMulticastSocket(ip, port, ttl, callback) {
    //    chrome.socket.create("udp", function (socket) {
    //        var socketId = socket.socketId;
    //        chrome.socket.setMulticastTimeToLive(socketId, ttl, function (result) {
    //            if (result != 0) {
    //                console.log("cms.smttl: " + result);
    //            }
    //            chrome.socket.bind(socketId, "0.0.0.0", port, function (result) {
    //                console.log("cms.bind: " + result);
    //                if (result == 0) {
    //                       chrome.socket.joinGroup(socketId, ip, function (result) {
    //                        if (result != 0) {
    //                            console.log("cms.joinGroup: " + result);
    //                        } else {
    //                            console.log("cms: " + socketId)
    //                            callback(socket);
    //                        }
    //                    });             
    //                }
    //            });
    //        });
    //    });
    //};

    export function fullyQualifyUrl(domain, url) {
        var uri = new Uri(url);
        // If the url is fully qualified then there's nothing to do
        if (uri.protocol().toLowerCase() == 'http') {
            return url;
        } else {
            // set the protocol
            uri.protocol('http');
            // If it looks relative, get the base of the domain and prepend it
            var host = uri.host();
            if (!host || host.endsWith('.html') || host.endsWith('.htm')) {
                uri = new Uri(domain);
                uri.setPath('/' + host);
            }
            return uri.toString();
        }
    }

    export function uint16ToArray(array, offset, val) {
        array[offset] = (val >> 8) & 0xff;
        array[offset + 1] = val & 0xff;
    }

    export function arrayToUint16(array, offset) {
        return (array[offset] << 8) + array[offset + 1];
    }
}