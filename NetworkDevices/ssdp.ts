/* Handle all sddp related network stuff */

/// <reference path="./util.ts" />
/// <reference path="jsUri/jsuri-1.1.1.min.d.ts" />

namespace Ssdp {

    declare var Windows: any;
    declare var jsUri: any;
    declare var Uri: any;

    // NB COMPAT Bank last line is key to most devices
    var SSDP_DISCOVER = [
        'M-SEARCH * HTTP/1.1',
        'HOST: 239.255.255.250:1900',
        'MAN: "ssdp:discover"',
        'MX: 1',
        'ST: ssdp:all',
        '\r\n'
    ].join('\r\n');

    var g_ssdpSearchSocket;
    var g_ssdpMulticastSocket;
    var g_ssdpLocations = {};

    // Search for SSDP devices by multicasting an M-SEARCH. 
    // Each device should respond with a NOTIFY that contains a 'LOCATION' URL
    // The LOCATION should provide the various XML properties
    // Call the callback for each device that responds properly
    export function ssdpSearch(deviceFoundCallback) {
        g_ssdpLocations = { };

        if (g_ssdpSearchSocket) {
            g_ssdpSearchSocket.close();
            g_ssdpSearchSocket = null;
        }

        //// handleSsdpMulticastMessages(deviceFoundCallback);

        // TODO - Listen for multicast
        g_ssdpSearchSocket = new Windows.Networking.Sockets.DatagramSocket();
        var remoteHost = new Windows.Networking.HostName("239.255.255.250");
        var ep = new Windows.Networking.EndpointPair(null, "", remoteHost, "1900");
        g_ssdpSearchSocket.onmessagereceived = function (eventArgs) { onSSDPMessageReceived(eventArgs, deviceFoundCallback); };
        g_ssdpSearchSocket.bindEndpointAsync(null, "").done(function () {
            g_ssdpSearchSocket.joinMulticastGroup(remoteHost);
            g_ssdpSearchSocket.getOutputStreamAsync(ep).done(function (outputStream) {
                console.log('ssdp output stream done');
                var dataWriter = new Windows.Storage.Streams.DataWriter(outputStream);
                dataWriter.writeString(SSDP_DISCOVER);
                dataWriter.storeAsync().done(function () {
                    console.log('storeAsync done');
                });
            });
        });


        // g_ssdpSearchSocket.bindEndpointAsync(null, "1900").done(function () {
            //g_ssdpSearchSocket.joinMulticastGroup(remoteHost);

        //    //g_ssdpSearchSocket.getOutputStreamAsync(remoteHost, "1900").done(function (outputStream) {
        //        console.log('ssdp output stream done');
        //        var dataWriter = new Windows.Storage.Streams.DataWriter(outputStream);
        //        dataWriter.writeString(SSDP_DISCOVER);
        //        dataWriter.storeAsync().done(function () {
        //            console.log('storeAsync done');
        //        });
        //    //});

        //g_ssdpSearchSocket.bindServiceNameAsync("").done(function () {
            // console.log('ssdp bind done');

        //    g_ssdpSearchSocket.joinMulticastGroup(remoteHost);
            //g_ssdpSearchSocket.getOutputStreamAsync(remoteHost, "1900").done(function (outputStream) {
            //    console.log('getOutputStreamAsync done');
            //    var dataWriter = new Windows.Storage.Streams.DataWriter(outputStream);
            //    dataWriter.writeString(SSDP_DISCOVER);
            //    dataWriter.storeAsync().done(function () {
            //        console.log('storeAsync done');
            //    });
            //});
        //});
    };

    function onSSDPMessageReceived(eventArgs, deviceFoundCallback) {
        var messageLength = eventArgs.getDataReader().unconsumedBufferLength;
        var message = eventArgs.getDataReader().readString(messageLength);
        var ip = eventArgs.remoteAddress;
        //console.log('Message Received: \r\n' + message);

        var info = getSsdpDeviceNotifyInfo(message);
        var location: string = info["LOCATION"];

        // TODO - Validate location is absolute
        console.log('onMessageReceived: loc:' + location);
        //console.log('onMessageReceived:  st:' + info["ST"]);

        // Got a location, get the xml properties (unless it's a dup)
        if (location && !g_ssdpLocations[location]) {
            g_ssdpLocations[location] = true;
            var device = new Util.Device(location, ip);
            getSsdpDeviceXmlInfo(device, deviceFoundCallback);
        }
    };


    function getSsdpDeviceNotifyInfo(data) {
        var lines = data.split("\r\n");
        var info = {};
        for (var i = 1; i < lines.length; i++) {
            var line = lines[i];
            var delimPos = line.indexOf(":");
            if (delimPos > 0) {
                info[line.substring(0, delimPos).toUpperCase()] = line.substring(delimPos + 1);
            }
        }
        return info;
    }

    function getSsdpDeviceXmlInfo(device, deviceFoundCallback) {
        var xhr = new XMLHttpRequest();
        var qualifiedLocation = new Uri(device.location);
        if (!qualifiedLocation.protocol()) qualifiedLocation.protocol('http');
        xhr.open("GET", qualifiedLocation.toString(), true);
        xhr.onreadystatechange = function (eventArgs) {
            onSsdpXMLReadyStateChange(eventArgs, xhr, device, deviceFoundCallback);
        }
        xhr.send();
    }

    function onSsdpXMLReadyStateChange(e, xhr, device, deviceFoundCallback) {
        // NB Some devices will refuse to respond
        // if (this.readyState == 4) {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            if (xhr.status == 200 && xhr.responseXML) {
                var xml = xhr.responseXML;
                device.friendlyName = Util.getXmlDataForTag(xml, "friendlyName") || Util.getXmlDataForTag(xml, "ModelDescription") || 'Unknown Name';
                device.manufacturer = Util.getXmlDataForTag(xml, "manufacturer") || Util.getXmlDataForTag(xml, "VendorName") || 'Unknown Manufacturer';
                device.model = Util.getXmlDataForTag(xml, "modelName") || Util.getXmlDataForTag(xml, "ModelName") || 'Unknown Model';
                device.presentationUrl = Util.getXmlDataForTag(xml, "presentationURL") || Util.getXmlDataForTag(xml, "PresentationURL");
                if (device.presentationUrl) {
                    device.presentationUrl = Util.fullyQualifyUrl(device.location, device.presentationUrl) || "";
                } else {
                    device.presentationUrl = "";
                }

                console.log('ssdp: ' + device.friendlyName + " (" + device.manufacturer + " " + device.model + ") [" + device.ip + "]");

                //            console.log('ssdpxmlrsc: ...');
                //            console.log(' loc: ' + device.location);     
                //            console.log(' info: ' + device.friendlyName + " (" + device.manufacturer + " " + device.model + ") [" + device.ip + "]");
                //            console.log(' purl: ' + device.presentationUrl);   

                deviceFoundCallback(device);
            }
        }
    }

}