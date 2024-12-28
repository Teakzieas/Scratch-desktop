const formatMessage = require('format-message');
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const path = window.require('path');
const i2c = window.require(path.join(__static, 'i2c.node'));
const gpio = window.require(path.join(__static, 'gpiolib.node'))

const device = i2c.createDevice("/dev/i2c-1", 0x08);
const tempSensor = i2c.createDevice('/dev/i2c-1', 0x38);
const oled = i2c.createDevice("/dev/i2c-1", 0x3C);



//Motor Controller
function scaleTo255(value) {
    if (value < 0 || value > 100) {
        throw new Error("Value must be between 0 and 100.");
    }
    return Math.round((value / 100) * 255);
}

//Temp Sensor
async function readAHT20(type)
{
    
    //initialize the AHT20 sensor
    const initData = Buffer.from([0xBE]);
    await i2c.writeData(tempSensor, initData);
    await new Promise(resolve => setTimeout(resolve, 10));
    
    
    // trigger a measurement
    const mesureData = Buffer.from([0xAC, 0x33, 0x00]);
    await i2c.writeData(tempSensor, mesureData);
    // Wait for the measurement to complete
    await new Promise(resolve => setTimeout(resolve, 80));
    
    

    const sensorData = i2c.readData(tempSensor,6)

    // Parse the data to extract temperature and humidity
    const humidity = ((sensorData[1] << 12) | (sensorData[2] << 4) | (sensorData[3] >> 4)) * 100.0 / 1048576.0;
    const temperature = (((sensorData[3] & 0x0F) << 16) | (sensorData[4] << 8) | sensorData[5]) * 200.0 / 1048576.0 - 50.0;

    console.log(`Temperature: ${temperature.toFixed(2)}°C`);
    console.log(`Humidity: ${humidity.toFixed(2)}%`);

    if(type == 2)
    {
        return humidity
    }
    else if(type == 0)
    {
        return temperature  
    }
    else
    {
        return (temperature * 9/5) + 32
    }
    
}

//OLED
const WIDTH = 128;
const HEIGHT = 64;
const PAGES = HEIGHT / 8; 

const CMD_MODE = 0x00; 
const DATA_MODE = 0x40;

var pagestatus = [false,false,false,false,false,false,false,false]


const INIT_CMDS = [
    0xAE,       // Display OFF
    0xD5, 0x80, // Set display clock divide ratio/oscillator frequency
    0xA8, 0x3F, // Set multiplex ratio (HEIGHT - 1)
    0xD3, 0x00, // Set display offset
    0x40,       // Set display start line
    0x8D, 0x14, // Enable charge pump
    0x20, 0x00, // Set memory addressing mode to horizontal
    0xA1,       // Set segment re-map (column address 127 is SEG0)
    0xC8,       // Set COM output scan direction (COM[N-1] to COM0)
    0xDA, 0x12, // Set COM pins hardware configuration
    0x81, 0xCF, // Set contrast control
    0xD9, 0xF1, // Set pre-charge period
    0xDB, 0x40, // Set VCOMH deselect level
    0xA4,       // Disable entire display on (output follows RAM contents)
    0xA6,       // Set normal display (not inverted)
    0xAF        // Display ON
];

  fontData =  [
    0x00, 0x00, 0x00, 0x00, 0x00, // (space)
    0x00, 0x00, 0x5F, 0x00, 0x00, // !
    0x00, 0x07, 0x00, 0x07, 0x00, // "
    0x14, 0x7F, 0x14, 0x7F, 0x14, // #
    0x24, 0x2A, 0x7F, 0x2A, 0x12, // $
    0x23, 0x13, 0x08, 0x64, 0x62, // %
    0x36, 0x49, 0x55, 0x22, 0x50, // &
    0x00, 0x05, 0x03, 0x00, 0x00, // '
    0x00, 0x1C, 0x22, 0x41, 0x00, // (
    0x00, 0x41, 0x22, 0x1C, 0x00, // )
    0x08, 0x2A, 0x1C, 0x2A, 0x08, // *
    0x08, 0x08, 0x3E, 0x08, 0x08, // +
    0x00, 0x50, 0x30, 0x00, 0x00, // ,
    0x08, 0x08, 0x08, 0x08, 0x08, // -
    0x00, 0x60, 0x60, 0x00, 0x00, // .
    0x20, 0x10, 0x08, 0x04, 0x02, // /
    0x3E, 0x51, 0x49, 0x45, 0x3E, // 0
    0x00, 0x42, 0x7F, 0x40, 0x00, // 1
    0x42, 0x61, 0x51, 0x49, 0x46, // 2
    0x21, 0x41, 0x45, 0x4B, 0x31, // 3
    0x18, 0x14, 0x12, 0x7F, 0x10, // 4
    0x27, 0x45, 0x45, 0x45, 0x39, // 5
    0x3C, 0x4A, 0x49, 0x49, 0x30, // 6
    0x01, 0x71, 0x09, 0x05, 0x03, // 7
    0x36, 0x49, 0x49, 0x49, 0x36, // 8
    0x06, 0x49, 0x49, 0x29, 0x1E, // 9
    0x00, 0x36, 0x36, 0x00, 0x00, // :
    0x00, 0x56, 0x36, 0x00, 0x00, // ;
    0x00, 0x08, 0x14, 0x22, 0x41, // <
    0x14, 0x14, 0x14, 0x14, 0x14, // =
    0x41, 0x22, 0x14, 0x08, 0x00, // >
    0x02, 0x01, 0x51, 0x09, 0x06, // ?
    0x32, 0x49, 0x79, 0x41, 0x3E, // @
    0x7E, 0x11, 0x11, 0x11, 0x7E, // A
    0x7F, 0x49, 0x49, 0x49, 0x36, // B
    0x3E, 0x41, 0x41, 0x41, 0x22, // C
    0x7F, 0x41, 0x41, 0x22, 0x1C, // D
    0x7F, 0x49, 0x49, 0x49, 0x41, // E
    0x7F, 0x09, 0x09, 0x01, 0x01, // F
    0x3E, 0x41, 0x41, 0x51, 0x32, // G
    0x7F, 0x08, 0x08, 0x08, 0x7F, // H
    0x00, 0x41, 0x7F, 0x41, 0x00, // I
    0x20, 0x40, 0x41, 0x3F, 0x01, // J
    0x7F, 0x08, 0x14, 0x22, 0x41, // K
    0x7F, 0x40, 0x40, 0x40, 0x40, // L
    0x7F, 0x02, 0x04, 0x02, 0x7F, // M
    0x7F, 0x04, 0x08, 0x10, 0x7F, // N
    0x3E, 0x41, 0x41, 0x41, 0x3E, // O
    0x7F, 0x09, 0x09, 0x09, 0x06, // P
    0x3E, 0x41, 0x51, 0x21, 0x5E, // Q
    0x7F, 0x09, 0x19, 0x29, 0x46, // R
    0x46, 0x49, 0x49, 0x49, 0x31, // S
    0x01, 0x01, 0x7F, 0x01, 0x01, // T
    0x3F, 0x40, 0x40, 0x40, 0x3F, // U
    0x1F, 0x20, 0x40, 0x20, 0x1F, // V
    0x7F, 0x20, 0x18, 0x20, 0x7F, // W
    0x63, 0x14, 0x08, 0x14, 0x63, // X
    0x03, 0x04, 0x78, 0x04, 0x03, // Y
    0x61, 0x51, 0x49, 0x45, 0x43, // Z
    0x7D, 0x12, 0x12, 0x7D, 0x00, // Ä
    0x3D, 0x42, 0x42, 0x42, 0x3D, // Ö
    0x3D, 0x40, 0x40, 0x40, 0x3D, // Ü
    0x00, 0x00, 0x7F, 0x41, 0x41, // [
    0x02, 0x04, 0x08, 0x10, 0x20, // "\"
    0x41, 0x41, 0x7F, 0x00, 0x00, // ]
    0x04, 0x02, 0x01, 0x02, 0x04, // ^
    0x40, 0x40, 0x40, 0x40, 0x40, // _
    0x00, 0x01, 0x02, 0x04, 0x00, // `
    0x20, 0x54, 0x54, 0x54, 0x78, // a
    0x7F, 0x48, 0x44, 0x44, 0x38, // b
    0x38, 0x44, 0x44, 0x44, 0x20, // c
    0x38, 0x44, 0x44, 0x48, 0x7F, // d
    0x38, 0x54, 0x54, 0x54, 0x18, // e
    0x08, 0x7E, 0x09, 0x01, 0x02, // f
    0x08, 0x14, 0x54, 0x54, 0x3C, // g
    0x7F, 0x08, 0x04, 0x04, 0x78, // h
    0x00, 0x44, 0x7D, 0x40, 0x00, // i
    0x20, 0x40, 0x44, 0x3D, 0x00, // j
    0x00, 0x7F, 0x10, 0x28, 0x44, // k
    0x00, 0x41, 0x7F, 0x40, 0x00, // l
    0x7C, 0x04, 0x18, 0x04, 0x78, // m
    0x7C, 0x08, 0x04, 0x04, 0x78, // n
    0x38, 0x44, 0x44, 0x44, 0x38, // o
    0x7C, 0x14, 0x14, 0x14, 0x08, // p
    0x08, 0x14, 0x14, 0x18, 0x7C, // q
    0x7C, 0x08, 0x04, 0x04, 0x08, // r
    0x48, 0x54, 0x54, 0x54, 0x20, // s
    0x04, 0x3F, 0x44, 0x40, 0x20, // t
    0x3C, 0x40, 0x40, 0x20, 0x7C, // u
    0x1C, 0x20, 0x40, 0x20, 0x1C, // v
    0x3C, 0x40, 0x30, 0x40, 0x3C, // w
    0x44, 0x28, 0x10, 0x28, 0x44, // x
    0x0C, 0x50, 0x50, 0x50, 0x3C, // y
    0x44, 0x64, 0x54, 0x4C, 0x44, // z
    0x20, 0x55, 0x54, 0x55, 0x78, // ä
    0x3A, 0x44, 0x44, 0x3A, 0x00, // ö
    0x3A, 0x40, 0x40, 0x3A, 0x00, // ü
    0x00, 0x08, 0x36, 0x41, 0x00, // {
    0x00, 0x00, 0x7F, 0x00, 0x00, // |
    0x00, 0x41, 0x36, 0x08, 0x00, // }
    0x14, 0x3E, 0x55, 0x41, 0x22, // €
    0x08, 0x08, 0x2A, 0x1C, 0x08, // -> (ALT + 0134) † 
    0x08, 0x1C, 0x2A, 0x08, 0x08, // <- (ALT + 0135) ‡
    0x00, 0x00, 0x07, 0x05, 0x07  // °
  ],

  lookup = [' ', '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
           '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?', '@',
           'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q',
           'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Ä', 'Ö', 'Ü', '[', '\\', ']', '^', '_', '`',
           'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q',
           'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'ä', 'ö', 'ü', '{', '|', '}', '€', '†', '‡', '°'
          ]
          
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));          

function sendCommand(cmd) {
    i2c.writeData(oled,Buffer.from([CMD_MODE, cmd]));
}

function sendData(data) {
    i2c.writeData(oled,Buffer.concat([Buffer.from([DATA_MODE]), data]));
}

function getGlyph(char) {
    const index = lookup.indexOf(char);
    if (index === -1) {
        console.error(`Character "${char}" not found in lookup.`);
        return Array(10).fill(0x00); // Return an empty glyph
    }
    return Glyph = fontData.slice(index * 5, index * 5 + 5);
}

function scaleX(array, factor) {
    const scaledArray = [];
    for (const item of array) {
        for (let i = 0; i < factor; i++) {
            scaledArray.push(item);
        }
    }
    return scaledArray;
}

function scaleY(Hex,size) {
    let binary = Hex.toString(2).padStart(8, '0');
    let scaledbinary = '';
    for (let i = 0; i < binary.length; i++) {
        let bit = binary[i];
        scaledbinary += bit.repeat(size);
    }
    return scaledbinary;
}

async function drawText(text,page,size) {
    
    var time = new Date().getTime()
    for (let i = 0; i < size; i++) {
        pagestatus[page+i] = time
        
    }
    await delay(150);
    
    for (let i = 0; i < size; i++) { // Clear `size` number of pages starting from `page`
            sendCommand(0xB0 + page + i); // Set the page address
            sendCommand(0x00);            // Set lower column start address
            sendCommand(0x10);            // Set higher column start address
            for (let j = 0; j < 128; j++) { // Assuming 128 columns per page
                sendData(Buffer.from([0x00,0x00])); // Write blank data to clear
            }
    }
    
    let column = 1;
    const maxColumns = WIDTH; // Maximum columns available per line
    
    
        
    for (const char of text) {
        var glyph = getGlyph(char);
        glyph = scaleX(glyph,size)
        const scaledGlyphs = [];
        for (let i = 0; i < size; i++) {
            scaledGlyphs.push([]);
        }
        
        for (const item of glyph) {
            const scaledBinary = scaleY(item, size);
            
            for (let i = 0; i < size; i++) {
                const byte = scaledBinary.substring(i * 8, (i + 1) * 8);
                scaledGlyphs[i].push(parseInt(byte, 2));
            }
        }
        
        
        for (let i = 0; i < size; i++) {
            sendCommand(0xB0 + page + i);
            sendCommand(0x00 + (column & 0x0F));
            sendCommand(0x10 + (column >> 4));
            sendData(Buffer.from(scaledGlyphs[size-1 - i]));
        }
        

        column += 5*size+1*size; // Move to next character
    }
}

async function scrollTextContinuous(text, page, size) {
    var speed = 50
    var time = new Date().getTime()
    for (let i = 0; i < size; i++) {
        pagestatus[page+i] = time
        
    }
    const maxVisibleColumns = WIDTH; // Maximum columns visible on the display
    const glyphWidth = 5 * size + size; // Width of a single character (glyph width + space)
    const totalTextWidth = text.length * glyphWidth;
    
    // Create buffers for each scaled row
    const buffers = Array(size).fill().map(() => 
        Buffer.alloc(totalTextWidth + maxVisibleColumns));

    // Render the entire text into the buffers
    let offset = 0;
    for (const char of text) {
        const glyph = getGlyph(char);
        const scaledGlyph = scaleX(glyph, size);
        
        for (const col of scaledGlyph) {
            const scaledBinary = scaleY(col, size);
            for (let i = 0; i < size; i++) {
                const byte = scaledBinary.substring(i * 8, (i + 1) * 8);
                buffers[size-1 - i][offset] = parseInt(byte, 2);
            }
            offset++;
        }
        offset += size; // Add space between characters
    }

    // Copy start of text to end of buffers for seamless scrolling
    for (const buffer of buffers) {
        buffer.copy(buffer, totalTextWidth, 0, maxVisibleColumns);
    }

    // Scroll the text continuously
    let scrollOffset = 0;
    var stop = true
    while (stop) {
        
        for (let i = 0; i < size; i++) {
            if (pagestatus[page+i] != time)
            {
                stop = false
            }
            const visibleData = buffers[i].slice(scrollOffset, scrollOffset + maxVisibleColumns);
            sendCommand(0xB0 + page + i);
            sendCommand(0x00);
            sendCommand(0x10);
            sendData(visibleData);
        }

        scrollOffset = (scrollOffset + 1) % totalTextWidth;
        await delay(speed);
    }
    for (let i = 0; i < size; i++) { // Clear `size` number of pages starting from `page`
            sendCommand(0xB0 + page + i); // Set the page address
            sendCommand(0x00);            // Set lower column start address
            sendCommand(0x10);            // Set higher column start address
            for (let j = 0; j < 128; j++) { // Assuming 128 columns per page
                sendData(Buffer.from([0x00,0x00])); // Write blank data to clear
            }
        }
    
}

async function AddText(text,row) {
   
    row = (row-1)*2
    if (text.length < 11) 
    {
        drawText(text,row,2)
    }
    else
    {
        scrollTextContinuous(text+"   ", row, 2);
    }
}

async function ClearOLED(row){
    if (row == 5)
    {
        for (let i = 0; i < 9; i++) 
        {
            pagestatus[i] = time
        }
        await delay(150);
        for (let i = 0; i < 9; i++) 
        {
            sendCommand(0xB0 + i); // Set the page address
            sendCommand(0x00);            // Set lower column start address
            sendCommand(0x10);            // Set higher column start address
            for (let j = 0; j < 128; j++) 
            {
                sendData(Buffer.from([0x00,0x00])); // Write blank data to clear
            }
        
        }
    }
    else
    {
        row = (row-1)*2
        var time = new Date().getTime()
        for (let i = 0; i < 2; i++) 
        {
            pagestatus[row+i] = time
        }
        await delay(150);
        for (let i = 0; i < 2; i++) 
        {
            sendCommand(0xB0 + row + i); // Set the page address
            sendCommand(0x00);            // Set lower column start address
            sendCommand(0x10);            // Set higher column start address
            for (let j = 0; j < 128; j++) 
            {
                sendData(Buffer.from([0x00,0x00])); // Write blank data to clear
            }
        }
    }
}

function initOLED(){
    for (const cmd of INIT_CMDS) {
        sendCommand(cmd);
    }
    ClearOLED(5);
}

initOLED()


//Ultrasonic Sensor
var cachedUltrasonicValue = null;
var lastReadTime = 0;

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgdmVyc2lvbj0iMS4xIgogICB3aWR0aD0iODAwIgogICBoZWlnaHQ9IjgwMCIKICAgaWQ9InN2ZzM0MTAiCiAgIGlua3NjYXBlOnZlcnNpb249IjAuOTEgcjEzNzI1IgogICBzb2RpcG9kaTpkb2NuYW1lPSJyYXNwYmVycnktcGktbG9nb20uc3ZnIj4KICA8bWV0YWRhdGEKICAgICBpZD0ibWV0YWRhdGEzNDQ0Ij4KICAgIDxyZGY6UkRGPgogICAgICA8Y2M6V29yawogICAgICAgICByZGY6YWJvdXQ9IiI+CiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+CiAgICAgICAgPGRjOnR5cGUKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIiAvPgogICAgICAgIDxkYzp0aXRsZT48L2RjOnRpdGxlPgogICAgICA8L2NjOldvcms+CiAgICA8L3JkZjpSREY+CiAgPC9tZXRhZGF0YT4KICA8ZGVmcwogICAgIGlkPSJkZWZzMzQ0MiIgLz4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEiCiAgICAgb2JqZWN0dG9sZXJhbmNlPSIxMCIKICAgICBncmlkdG9sZXJhbmNlPSIxMCIKICAgICBndWlkZXRvbGVyYW5jZT0iMTAiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAiCiAgICAgaW5rc2NhcGU6cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9IjEzODEiCiAgICAgaW5rc2NhcGU6d2luZG93LWhlaWdodD0iOTY1IgogICAgIGlkPSJuYW1lZHZpZXczNDQwIgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBmaXQtbWFyZ2luLWxlZnQ9Ijc1IgogICAgIGZpdC1tYXJnaW4tcmlnaHQ9Ijc1IgogICAgIGlua3NjYXBlOnpvb209IjAuNzg4NjIwNDgiCiAgICAgaW5rc2NhcGU6Y3g9IjMyMC44NjU1IgogICAgIGlua3NjYXBlOmN5PSIzNjAiCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjQxMCIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iMCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIwIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzM0MTAiIC8+CiAgPHBhdGgKICAgICBkPSJtIDI2Ny40MjYxOSw0My42MTUxMzggYyAtMy42MTkzLDAuMTEyMzE5IC03LjUxNzE1LDEuNDQ5MzI3IC0xMS45Mzc1LDQuOTM3NSAtMTAuODI2OTYsLTQuMTc2MyAtMjEuMzI3MDksLTUuNjI3MTg5IC0zMC43MTg3NSwyLjg3NSAtMTQuNDkzODYsLTEuODgwNzU4IC0xOS4yMTAyOSwyLjAwMDc0NCAtMjIuNzgxMjUsNi41MzEyNSAtMy4xODI1NSwtMC4wNjU4NyAtMjMuODE4ODUsLTMuMjcyMDcgLTMzLjI4MTI1LDEwLjg0Mzc1IC0yMy43ODE2NSwtMi44MTM0MiAtMzEuMjk2NzgsMTMuOTg3ODggLTIyLjc4MTI1LDI5LjY1NjI1IC00Ljg1NjkxLDcuNTE4OTUyIC05Ljg4OTUxLDE0Ljk0NzIzMiAxLjQ2ODc1LDI5LjI4MTI1MiAtNC4wMTgwMSw3Ljk4MzUxIC0xLjUyNzQzLDE2LjY0NDAzIDcuOTM3NSwyNy4xMjUgLTIuNDk3ODYsMTEuMjIyNiAyLjQxMjA3LDE5LjE0MDg2IDExLjIxODc1LDI1LjMxMjUgLTEuNjQ3MDksMTUuMzU3NTYgMTQuMDgzNSwyNC4yODc0MyAxOC43ODEyNSwyNy40Njg3NSAxLjgwMzY3LDguOTQ4NjggNS41NjI5MSwxNy4zOTI3IDIzLjUzMTI1LDIyLjA2MjUgMi45NjMyMywxMy4zMzYxIDEzLjc2MjA2LDE1LjYzOTA2IDI0LjIxODc1LDE4LjQzNzUgLTM0LjU2MTkzLDIwLjA4OTU0IC02NC4yMDA2Nyw0Ni41MjI2NiAtNjQsMTExLjM3NSBsIC01LjA2MjUsOS4wMzEyNSBjIC0zOS42MzA4NywyNC4xMDIyOSAtNzUuMjg1Mjk5LDEwMS41NjYyNiAtMTkuNTMxMjUsMTY0LjUzMTI1IDMuNjQxODcsMTkuNzA4MzggOS43NDk1OSwzMy44NjM5NiAxNS4xODc1LDQ5LjUzMTI1IDguMTMzODMsNjMuMTMwNTggNjEuMjE3NjMsOTIuNjkxNjEgNzUuMjE4NzUsOTYuMTg3NSAyMC41MTY1MywxNS42MjgxMiA0Mi4zNjgxOCwzMC40NTY3MiA3MS45Mzc1LDQwLjg0Mzc1IDI3Ljg3NTE1LDI4Ljc0OTQ2IDU4LjA3Mzg4LDM5LjcwNjQgODguNDM3NSwzOS42ODc1IDAuNDQ1MTUsLTIuOGUtNCAwLjg5ODUzLDAuMDA1IDEuMzQzNzUsMCAzMC4zNjM2MywwLjAxODkgNjAuNTYyMzUsLTEwLjkzODA0IDg4LjQzNzUsLTM5LjY4NzUgMjkuNTY5MzIsLTEwLjM4NzAzIDUxLjQyMDk3LC0yNS4yMTU2MyA3MS45Mzc1LC00MC44NDM3NSAxNC4wMDExMiwtMy40OTU4OSA2Ny4wODQ5MiwtMzMuMDU2OTIgNzUuMjE4NzUsLTk2LjE4NzUgNS40Mzc5MSwtMTUuNjY3MjkgMTEuNTQ1NjIsLTI5LjgyMjg3IDE1LjE4NzUsLTQ5LjUzMTI1IDU1Ljc1NDA0LC02Mi45NjQ5OSAyMC4wOTk2MSwtMTQwLjQyODk2IC0xOS41MzEyNSwtMTY0LjUzMTI1IGwgLTUuMDYyNSwtOS4wMzEyNSBjIDAuMjAwNjcsLTY0Ljg1MjM0IC0yOS40MzgwNywtOTEuMjg1NDYgLTY0LC0xMTEuMzc1IDEwLjQ1NjY5LC0yLjc5ODQ0IDIxLjI1NTUyLC01LjEwMTQgMjQuMjE4NzUsLTE4LjQzNzUgMTcuOTY4MzQsLTQuNjY5OCAyMS43Mjc1OCwtMTMuMTEzODIgMjMuNTMxMjUsLTIyLjA2MjUgNC42OTc3NSwtMy4xODEzMiAyMC40MjgzNCwtMTIuMTExMTkgMTguNzgxMjUsLTI3LjQ2ODc1IDguODA2NjgsLTYuMTcxNjQgMTMuNzE2NjEsLTE0LjA4OTkgMTEuMjE4NzUsLTI1LjMxMjUgOS40NjQ5NCwtMTAuNDgwOTcgMTEuOTU1NSwtMTkuMTQxNDkgNy45Mzc1LC0yNy4xMjUgMTEuMzU4MjUsLTE0LjMzNDAyIDYuMzI1NjYsLTIxLjc2MjMgMS40Njg3NSwtMjkuMjgxMjUyIDguNTE1NTMsLTE1LjY2ODM3IDEuMDAwNCwtMzIuNDY5NjcgLTIyLjc4MTI1LC0yOS42NTYyNSAtOS40NjI0LC0xNC4xMTU4MiAtMzAuMDk4NywtMTAuOTA5NjE1IC0zMy4yODEyNSwtMTAuODQzNzUgLTMuNTcwOTYsLTQuNTMwNTA2IC04LjI4NzM5LC04LjQxMjAwOCAtMjIuNzgxMjUsLTYuNTMxMjUgLTkuMzkxNjYsLTguNTAyMTg5IC0xOS44OTE3OSwtNy4wNTEzIC0zMC43MTg3NSwtMi44NzUgLTEyLjg1OTIsLTEwLjE0NzQxMyAtMjEuMzcyMjYsLTIuMDEzMjk2IC0zMS4wOTM3NSwxLjA2MjUgLTE1LjU3Mzg1LC01LjA4Nzc3OCAtMTkuMTMzMDIsMS44ODA5MDggLTI2Ljc4MTI1LDQuNzE4NzUgLTE2Ljk3NTI1LC0zLjU4ODA3NiAtMjIuMTM1Niw0LjIyMzUzMiAtMzAuMjgxMjUsMTIuNDY4NzUgbCAtOS40Njg3NSwtMC4xODc1IGMgLTI1LjYxMDU0LDE1LjA5MzExIC0zOC4zMzM3OCw0NS44MjU1MDIgLTQyLjg0Mzc1LDYxLjYyNTAwMiAtNC41MTIwNiwtMTUuODAxOTggLTE3LjIwNjQ3LC00Ni41MzQ1NDIgLTQyLjgxMjUsLTYxLjYyNTAwMiBsIC05LjQ2ODc1LDAuMTg3NSBjIC04LjE0NTY1LC04LjI0NTIxOCAtMTMuMzA2LC0xNi4wNTY4MjcgLTMwLjI4MTI1LC0xMi40Njg3NSAtNy42NDgyMywtMi44Mzc4NDIgLTExLjIwNzQsLTkuODA2NTI3IC0yNi43ODEyNSwtNC43MTg3NSAtNi4zNzk3MywtMi4wMTg0OTEgLTEyLjI0NjY3LC02LjIxNDQyOCAtMTkuMTU2MjUsLTYgeiIKICAgICBzdHlsZT0iZmlsbDojMDAwMDAwIgogICAgIGlkPSJwYXRoMzQxMiIKICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogIDxwYXRoCiAgICAgZD0ibSAyMTYuNDQzMDMsMTEwLjAxNDQ3IGMgNjcuOTQ3NjcsMzUuMDMxMzYgMTA3LjQ0Njg5LDYzLjM2ODk3IDEyOS4wODcxNyw4Ny41MDQ0NyAtMTEuMDgyMzUsNDQuNDE3NTkgLTY4Ljg5NjM4LDQ2LjQ0NDY0IC05MC4wMzU1OSw0NS4xOTg1OCA0LjMyODQyLC0yLjAxNDc0IDcuOTM5ODgsLTQuNDI3NzggOS4yMjA1MSwtOC4xMzU3NCAtNS4zMDQ0OSwtMy43Njk4MSAtMjQuMTEyODksLTAuMzk3MTkgLTM3LjI0MzYzLC03Ljc3NDE2IDUuMDQ0MDcsLTEuMDQ0OTkgNy40MDM0OCwtMi4wNjMwMiA5Ljc2Mjg5LC01Ljc4NTQyIC0xMi40MDU3MSwtMy45NTY3IC0yNS43Njg2MiwtNy4zNjY0MiAtMzMuNjI3NzUsLTEzLjkyMTE2IDQuMjQxMjUsMC4wNTI0IDguMjAxMTYsMC45NDg4IDEzLjc0MDM3LC0yLjg5MjcxIC0xMS4xMTE3LC01Ljk4ODE5IC0yMi45NjkxMSwtMTAuNzMzNTEgLTMyLjE4MTM5LC0xOS44ODczOCA1Ljc0NTIxLC0wLjE0MDYzIDExLjkzOTQ1LC0wLjA1NjggMTMuNzQwMzcsLTIuMTY5NTMgLTEwLjE3MDQ0LC02LjMwMDY4IC0xOC43NTEyNCwtMTMuMzA3ODcgLTI1Ljg1MzU5LC0yMC45NzIxNSA4LjAzOTk4LDAuOTcwNTIgMTEuNDM1MjgsMC4xMzQ3OCAxMy4zNzg3OCwtMS4yNjU1NiAtNy42ODc4LC03Ljg3NDE5IC0xNy40MTc1NiwtMTQuNTIzMTkgLTIyLjA1NjkxLC0yNC4yMjY0NCA1Ljk2OTYsMi4wNTc0OCAxMS40MzEyNSwyLjg0NTA2IDE1LjM2NzUyLC0wLjE4MDc5IC0yLjYxMjM3LC01Ljg5MzQ2IC0xMy44MDU0MiwtOS4zNjk2MiAtMjAuMjQ4OTcsLTIzLjE0MTY4IDYuMjg0MzYsMC42MDkzOCAxMi45NDk2MSwxLjM3MTExIDE0LjI4Mjc1LDAgLTIuOTIyMywtMTEuODg4NTYgLTcuOTI3NDUsLTE4LjU3MDAzMiAtMTIuODM2MzksLTI1LjQ5MjAwMiAxMy40NTAwNCwtMC4xOTk3MyAzMy44Mjc3NSwwLjA1MjMgMzIuOTA0NTcsLTEuMDg0NzcgbCAtOC4zMTY1NCwtOC40OTczMyBjIDEzLjEzNzYxLC0zLjUzNzI1IDI2LjU4MDY1LDAuNTY4MTYgMzYuMzM5NjYsMy42MTU4OCA0LjM4MTg2LC0zLjQ1NzY4IC0wLjA3NzYsLTcuODI5OTggLTUuNDIzODMsLTEyLjI5NDAxIDExLjE2NDk2LDEuNDkwNjQgMjEuMjUzODIsNC4wNTczOSAzMC4zNzM0NSw3LjU5MzM2IDQuODcyMzgsLTQuMzk5MzMgLTMuMTYzODksLTguNzk4NjYgLTcuMDUwOTgsLTEzLjE5Nzk5IDE3LjI0OTM2LDMuMjcyNTcgMjQuNTU3MTYsNy44NzA2OCAzMS44MTk4MSwxMi40NzQ4MSA1LjI2OTM1LC01LjA1MDggMC4zMDE2NiwtOS4zNDMzIC0zLjI1NDMsLTEzLjc0MDM2OSAxMy4wMDU2Niw0LjgxNzA0OSAxOS43MDQ3OCwxMS4wMzU1NDkgMjYuNzU3NTYsMTcuMTc1NDU5IDIuMzkxMTksLTMuMjI3MDUgNi4wNzQ5NCwtNS41OTI0IDEuNjI3MTUsLTEzLjM3ODc4IDkuMjM0MTYsNS4zMjI3MyAxNi4xODkyNiwxMS41OTUwNiAyMS4zMzM3NCwxOC42MjE4MiA1LjcxMzM2LC0zLjYzNzk0IDMuNDAzODcsLTguNjEzMDIgMy40MzUwOSwtMTMuMTk3OTkgOS41OTY2NSw3LjgwNjUyIDE1LjY4Njg3LDE2LjExMzk1IDIzLjE0MTY4LDI0LjIyNjQ1IDEuNTAxNjksLTEuMDkzNDQgMi44MTY2MSwtNC44MDE3MSAzLjk3NzQ3LC0xMC42NjY4NyAyMi44OTUzOSwyMi4yMTE4MTIgNTUuMjQ1OTEsNzguMTU4MjQyIDguMzE2NTQsMTAwLjM0MDg2MiAtMzkuOTE4NzcsLTMyLjk0NzE2IC04Ny42MTYxMywtNTYuODg3NTMgLTE0MC40NzcyMSwtNzQuODQ4ODYgeiIKICAgICBzdHlsZT0iZmlsbDojNzVhOTI4IgogICAgIGlkPSJwYXRoMzQxNCIKICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogIDxwYXRoCiAgICAgZD0ibSA1NzYuOTc2MDYsMTEwLjAxNDQ3IGMgLTY3Ljk0NzY3LDM1LjAzMTM2IC0xMDcuNDQ2ODksNjMuMzY4OTcgLTEyOS4wODcxNyw4Ny41MDQ0NyAxMS4wODIzNSw0NC40MTc1OSA2OC44OTYzOCw0Ni40NDQ2NCA5MC4wMzU1OSw0NS4xOTg1OCAtNC4zMjg0MiwtMi4wMTQ3NCAtNy45Mzk4OCwtNC40Mjc3OCAtOS4yMjA1MSwtOC4xMzU3NCA1LjMwNDQ5LC0zLjc2OTgxIDI0LjExMjg5LC0wLjM5NzE5IDM3LjI0MzYzLC03Ljc3NDE2IC01LjA0NDA3LC0xLjA0NDk5IC03LjQwMzQ4LC0yLjA2MzAyIC05Ljc2Mjg5LC01Ljc4NTQyIDEyLjQwNTcxLC0zLjk1NjcgMjUuNzY4NjIsLTcuMzY2NDIgMzMuNjI3NzUsLTEzLjkyMTE2IC00LjI0MTI2LDAuMDUyNCAtOC4yMDExNiwwLjk0ODggLTEzLjc0MDM3LC0yLjg5MjcxIDExLjExMTY5LC01Ljk4ODE5IDIyLjk2OTExLC0xMC43MzM1MSAzMi4xODEzOSwtMTkuODg3MzggLTUuNzQ1MjEsLTAuMTQwNjMgLTExLjkzOTQ1LC0wLjA1NjggLTEzLjc0MDM3LC0yLjE2OTUzIDEwLjE3MDQ0LC02LjMwMDY4IDE4Ljc1MTI0LC0xMy4zMDc4NyAyNS44NTM1OSwtMjAuOTcyMTUgLTguMDM5OTgsMC45NzA1MiAtMTEuNDM1MjgsMC4xMzQ3OCAtMTMuMzc4NzgsLTEuMjY1NTYgNy42ODc3OSwtNy44NzQxOSAxNy40MTc1NiwtMTQuNTIzMTkgMjIuMDU2OTEsLTI0LjIyNjQ0IC01Ljk2OTYxLDIuMDU3NDggLTExLjQzMTI1LDIuODQ1MDYgLTE1LjM2NzUyLC0wLjE4MDc5IDIuNjEyMzcsLTUuODkzNDYgMTMuODA1NDEsLTkuMzY5NjIgMjAuMjQ4OTcsLTIzLjE0MTY4IC02LjI4NDM2LDAuNjA5MzggLTEyLjk0OTYxLDEuMzcxMTEgLTE0LjI4Mjc2LDAgMi45MjIzMSwtMTEuODg4NTYgNy45Mjc0NiwtMTguNTcwMDIyIDEyLjgzNjQsLTI1LjQ5MjAwMiAtMTMuNDUwMDQsLTAuMTk5NzMgLTMzLjgyNzc1LDAuMDUyNCAtMzIuOTA0NTcsLTEuMDg0NzcgbCA4LjMxNjU0LC04LjQ5NzMzIGMgLTEzLjEzNzYyLC0zLjUzNzI1IC0yNi41ODA2NSwwLjU2ODE2IC0zNi4zMzk2NiwzLjYxNTg4IC00LjM4MTg2LC0zLjQ1NzY4IDAuMDc3NiwtNy44Mjk5OCA1LjQyMzgzLC0xMi4yOTQwMSAtMTEuMTY0OTYsMS40OTA2NCAtMjEuMjUzODIsNC4wNTczOSAtMzAuMzczNDUsNy41OTMzNiAtNC44NzIzOCwtNC4zOTkzMyAzLjE2Mzg5LC04Ljc5ODY2IDcuMDUwOTgsLTEzLjE5Nzk5IC0xNy4yNDkzNiwzLjI3MjU3IC0yNC41NTcxNiw3Ljg3MDY4IC0zMS44MTk4MSwxMi40NzQ4MSAtNS4yNjkzNSwtNS4wNTA4IC0wLjMwMTY2LC05LjM0MzMgMy4yNTQzLC0xMy43NDAzNjkgLTEzLjAwNTY2LDQuODE3MDQ5IC0xOS43MDQ3OCwxMS4wMzU1NDkgLTI2Ljc1NzU2LDE3LjE3NTQ1OSAtMi4zOTExOSwtMy4yMjcwNSAtNi4wNzQ5NCwtNS41OTI0IC0xLjYyNzE1LC0xMy4zNzg3OCAtOS4yMzQxNiw1LjMyMjczIC0xNi4xODkyNiwxMS41OTUwNiAtMjEuMzMzNzQsMTguNjIxODIgLTUuNzEzMzYsLTMuNjM3OTQgLTMuNDAzODcsLTguNjEzMDIgLTMuNDM1MDksLTEzLjE5Nzk5IC05LjU5NjY1LDcuODA2NTIgLTE1LjY4Njg3LDE2LjExMzk1IC0yMy4xNDE2OCwyNC4yMjY0NSAtMS41MDE2OSwtMS4wOTM0NCAtMi44MTY2MSwtNC44MDE3MSAtMy45Nzc0NywtMTAuNjY2ODcgLTIyLjg5NTM5LDIyLjIxMTgxMiAtNTUuMjQ1OTEsNzguMTU4MjQyIC04LjMxNjU0LDEwMC4zNDA4NjIgMzkuOTE4NzcsLTMyLjk0NzE2IDg3LjYxNjEzLC01Ni44ODc1MyAxNDAuNDc3MjEsLTc0Ljg0ODg2IHoiCiAgICAgc3R5bGU9ImZpbGw6Izc1YTkyOCIKICAgICBpZD0icGF0aDM0MTYiCiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICA8cGF0aAogICAgIGQ9Im0gNDc4Ljk5NzUzLDU2Mi4zMTk5MyBhIDgxLjM5MDExMSw3NS4wNTE3NjIgMCAwIDEgLTE2Mi43ODAyMiwwIDgxLjM5MDExMSw3NS4wNTE3NjIgMCAxIDEgMTYyLjc4MDIyLDAgeiIKICAgICBzdHlsZT0iZmlsbDojYmMxMTQyIgogICAgIGlkPSJwYXRoMzQxOCIKICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogIDxwYXRoCiAgICAgZD0iTSAzNTAuNTA1MjEsMzQ3LjkyMTMxIEEgNzIuOTk4ODM5LDg2LjEyOTY3NCAzNC4wMzQyMjYgMCAxIDI1NS41MzczNyw0OTEuNjMzNTcgNzIuOTk4ODM5LDg2LjEyOTY3NCAzNC4wMzQyMjYgMSAxIDM1MC41MDUyMSwzNDcuOTIxMzEgWiIKICAgICBzdHlsZT0iZmlsbDojYmMxMTQyIgogICAgIGlkPSJwYXRoMzQyMCIKICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogIDxwYXRoCiAgICAgZD0iTSA0NDEuNTM3MzksMzQzLjkyMTMxIEEgODYuMTI5Njc0LDcyLjk5ODgzOSA1NS45NjU3NzQgMCAwIDUzNi41MDUyMyw0ODcuNjMzNTcgODYuMTI5Njc0LDcyLjk5ODgzOSA1NS45NjU3NzQgMSAwIDQ0MS41MzczOSwzNDMuOTIxMzEgWiIKICAgICBzdHlsZT0iZmlsbDojYmMxMTQyIgogICAgIGlkPSJwYXRoMzQyMiIKICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogIDxwYXRoCiAgICAgZD0ibSAxODEuOTYxNDQsMzg0LjA0NjY5IGMgMzYuNDE0MjIsLTkuNzU2OTIgMTIuMjkxNTksMTUwLjYzNjUxIC0xNy4zMzMzOCwxMzcuNDc1NzcgLTMyLjU4Njc3LC0yNi4yMTI2OCAtNDMuMDgzMDcsLTEwMi45NzU0MyAxNy4zMzMzOCwtMTM3LjQ3NTc3IHoiCiAgICAgc3R5bGU9ImZpbGw6I2JjMTE0MiIKICAgICBpZD0icGF0aDM0MjQiCiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICA8cGF0aAogICAgIGQ9Im0gNjAyLjcyOTQ3LDM4Mi4wNDY2OSBjIC0zNi40MTQyMiwtOS43NTY5MiAtMTIuMjkxNiwxNTAuNjM2NTEgMTcuMzMzMzgsMTM3LjQ3NTc3IDMyLjU4Njc3LC0yNi4yMTI2OCA0My4wODMwNywtMTAyLjk3NTQzIC0xNy4zMzMzOCwtMTM3LjQ3NTc3IHoiCiAgICAgc3R5bGU9ImZpbGw6I2JjMTE0MiIKICAgICBpZD0icGF0aDM0MjYiCiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICA8cGF0aAogICAgIGQ9Im0gNDc5LjAyMjc3LDI2Mi42MTIyOSBjIDYyLjgzNDg2LC0xMC42MTAxMyAxMTUuMTE1OTQsMjYuNzIyMjkgMTEzLjAxMTM4LDk0Ljg1Nzk2IC0yLjA2NjkzLDI2LjEyMTEyIC0xMzYuMTU4NzIsLTkwLjk2OTA3IC0xMTMuMDExMzgsLTk0Ljg1Nzk2IHoiCiAgICAgc3R5bGU9ImZpbGw6I2JjMTE0MiIKICAgICBpZD0icGF0aDM0MjgiCiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICA8cGF0aAogICAgIGQ9Im0gMzA1LjQxMDk0LDI2MC42MTIyOSBjIC02Mi44MzQ4NiwtMTAuNjEwMTMgLTExNS4xMTU5NCwyNi43MjIyOSAtMTEzLjAxMTM4LDk0Ljg1Nzk2IDIuMDY2OTMsMjYuMTIxMTIgMTM2LjE1ODcyLC05MC45NjkwNyAxMTMuMDExMzgsLTk0Ljg1Nzk2IHoiCiAgICAgc3R5bGU9ImZpbGw6I2JjMTE0MiIKICAgICBpZD0icGF0aDM0MzAiCiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICA8cGF0aAogICAgIGQ9Im0gMzk1LjY3MDUxLDI0NC43MTQ1NyBjIC0zNy41MDI1OSwtMC45NzU0OCAtNzMuNDk1NDgsMjcuODM0MTggLTczLjU4MTU4LDQ0LjU0NDQzIC0wLjEwNDYyLDIwLjMwNDI2IDI5LjY1MTIsNDEuMDkyNjYgNzMuODM3MjYsNDEuNjIwMzUgNDUuMTIzMDUsMC4zMjMyMSA3My45MTU2MSwtMTYuNjQwNDkgNzQuMDYxMSwtMzcuNTk0MDkgMC4xNjQ4NCwtMjMuNzM5OTYgLTQxLjAzODc5LC00OC45Mzc0NCAtNzQuMzE2NzgsLTQ4LjU3MDY5IHoiCiAgICAgc3R5bGU9ImZpbGw6I2JjMTE0MiIKICAgICBpZD0icGF0aDM0MzIiCiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICA8cGF0aAogICAgIGQ9Im0gMzk3Ljk2MDU2LDY2MS4wNzU2NCBjIDMyLjY5NzQ0LC0xLjQyNzExIDc2LjU3MDgzLDEwLjUzMTk2IDc2LjY1NjgsMjYuMzk1OTggMC41NDI3LDE1LjQwNTIgLTM5Ljc4OTY5LDUwLjIxMDU1IC03OC44MjYzNCw0OS41Mzc2NSAtNDAuNDI3MjksMS43NDM5MSAtODAuMDY5MDgsLTMzLjExNTU5IC03OS41NDk1MSwtNDUuMTk4NTkgLTAuNjA1MDYsLTE3LjcxNTkzIDQ5LjIyNiwtMzEuNTQ3OTYgODEuNzE5MDUsLTMwLjczNTA0IHoiCiAgICAgc3R5bGU9ImZpbGw6I2JjMTE0MiIKICAgICBpZD0icGF0aDM0MzQiCiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICA8cGF0aAogICAgIGQ9Im0gMjc3LjE4OTkzLDU2Ny4wNjI1OCBjIDIzLjI3OTEsMjguMDQ1NzMgMzMuODkwNjYsNzcuMzE4OTkgMTQuNDYzNTUsOTEuODQzNTMgLTE4LjM3OTE3LDExLjA4Nzg0IC02My4wMTIyOCw2LjUyMTYyIC05NC43MzYyNCwtMzkuMDUxNTcgLTIxLjM5NTA1LC0zOC4yNDE2OCAtMTguNjM3NTgsLTc3LjE1NjYzIC0zLjYxNTg5LC04OC41ODkyNCAyMi40NjQ0MywtMTMuNjg0MjkgNTcuMTczNDMsNC43OTkwMiA4My44ODg1OCwzNS43OTcyOCB6IgogICAgIHN0eWxlPSJmaWxsOiNiYzExNDIiCiAgICAgaWQ9InBhdGgzNDM2IgogICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiIC8+CiAgPHBhdGgKICAgICBkPSJtIDUxNC4wNzIwOSw1NTguMTcwNjYgYyAtMjUuMTg2ODIsMjkuNTAxNjUgLTM5LjIxMjI3LDgzLjMwOTUxIC0yMC44Mzc4NSwxMDAuNjQyOCAxNy41NjgyOCwxMy40NjM2MSA2NC43MjkyLDExLjU4MTYyIDk5LjU2NTY2LC0zNi43NTU3NCAyNS4yOTU5OSwtMzIuNDY0NzEgMTYuODIwMTMsLTg2LjY4MjI1IDIuMzcwNzcsLTEwMS4wNzUxMSAtMjEuNDY0MDgsLTE2LjYwMjEzIC01Mi4yNzY5MSw0LjY0NDg5IC04MS4wOTg1OCwzNy4xODgwNSB6IgogICAgIHN0eWxlPSJmaWxsOiNiYzExNDIiCiAgICAgaWQ9InBhdGgzNDM4IgogICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiIC8+Cjwvc3ZnPgo='

/**
 * Class for the Raspberry Pi STEMHAT blocks in Scratch 3.0
 * @constructor
 */
class Scratch3PiSTEMHATBlocks {
    /**
     * @return {string} - the name of this extension.
     */
    static get EXTENSION_NAME() {
        return 'Raspberry Pi STEMHAT';
    }

    /**
     * @return {string} - the ID of this extension.
     */
    static get EXTENSION_ID() {
        return 'pistemhat';
    }

    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }


    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: Scratch3PiSTEMHATBlocks.EXTENSION_ID,
            name: Scratch3PiSTEMHATBlocks.EXTENSION_NAME,
            blockIconURI: blockIconURI,
            blocks: [
                {
                    opcode: 'when_buttonPressed',
                    text: formatMessage({
                        id: 'pistemhat.WhenBtnPressed',
                        default: 'when Button [BUTTON] is pressed',
                        description: 'when a button is pressed'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        BUTTON: {
                            type: ArgumentType.STRING,
                            menu: 'BUTTONs',
                            defaultValue: '5'
                        }
                    }
                },
                {
                    opcode: 'set_LED',
                    text: formatMessage({
                        id: 'pistemhat.set_LED',
                        default: 'set LED [LED] to [COLOUR]',
                        description: 'set the led to spesific color'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        LED: {
                            type: ArgumentType.STRING,
                            menu: 'LEDs',
                            defaultValue: '0'
                        },
                        COLOUR: {
                            type: ArgumentType.COLOR
                        }
                    }
                },
                {
                    opcode: 'set_BUZZER',
                    text: formatMessage({
                        id: 'pistemhat.set_BUZZER',
                        default: 'set Buzzer to [STATE]',
                        description: 'set the buzzer to state'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        STATE: {
                            type: ArgumentType.STRING,
                            menu: 'STATEs',
                            defaultValue: 'ON'
                        }
                    }
                },
                {
                    opcode: 'set_MOTOR',
                    text: formatMessage({
                        id: 'pistemhat.set_MOTOR',
                        default: 'set [MOTOR] at power [POWER]%',
                        description: 'set motor to power'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR: {
                            type: ArgumentType.STRING,
                            menu: 'MOTORs',
                            defaultValue: 'Both Motors'
                        },
                        POWER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '50'
                        }
                    }
                },
                {
                    opcode: 'set_MOTOR_EACH',
                    text: formatMessage({
                        id: 'pistemhat.set_MOTOR_EACH',
                        default: 'set left motor to [POWERM1]% and right motor to [POWERM2]%',
                        description: 'set motor power to each motor'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        POWERM1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '50'
                        },
                        POWERM2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '50'
                        }
                    }
                },
                {
                    opcode: 'stop_MOTOR',
                    text: formatMessage({
                        id: 'pistemhat.stop_MOTOR',
                        default: 'Stop [MOTOR]',
                        description: 'Stop motor'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR: {
                            type: ArgumentType.STRING,
                            menu: 'MOTORs',
                            defaultValue: 'Both Motors'
                        }
                    }
                },
                {
                    opcode: 'set_SERVO',
                    text: formatMessage({
                        id: 'pistemhat.set_SERVO',
                        default: 'set Servo [SERVO] position to [DEGREE]°',
                        description: 'set servo to position'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        SERVO: {
                            type: ArgumentType.STRING,
                            menu: 'SERVOs',
                            defaultValue: '1'
                        },
                        DEGREE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90'
                        }
                    }
                },
                {
                    opcode: 'set_OLED',
                    text: formatMessage({
                        id: 'pistemhat.set_OLED',
                        default: 'set OLED to [TEXT] at [ROW]',
                        description: 'set servo to position'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello'
                        },
                        ROW: {
                            type: ArgumentType.NUMBER,
                            menu: 'ROWs',
                            defaultValue: '1'
                        }
                    }
                },
                {
                    opcode: 'reset_OLED',
                    text: formatMessage({
                        id: 'pistemhat.reset_OLED',
                        default: 'Clear OLED row [ROWDEL]',
                        description: 'set servo to position'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING
                        },
                        ROWDEL: {
                            type: ArgumentType.STRING,
                            menu: 'ROWDELs',
                            defaultValue: 'All'
                        }
                    }
                },
                {
                    opcode: 'get_button',
                    text: formatMessage({
                        id: 'pistemhat.get_button',
                        default: 'get button [BUTTON] pressed state',
                        description: 'get the button pressed state'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        BUTTON: {
                            type: ArgumentType.STRING,
                            menu: 'BUTTONs',
                            defaultValue: '5'
                        }
                    }
                },
                {
                    opcode: 'get_analog',
                    text: formatMessage({
                        id: 'pistemhat.get_analog',
                        default: 'get analog [ANALOG]',
                        description: 'get the analog reading 0-255'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ANALOG: {
                            type: ArgumentType.STRING,
                            menu: 'ANALOGs',
                            defaultValue: 'AN0'
                        }
                    }
                },
                {
                    opcode: 'get_temp',
                    text: formatMessage({
                        id: 'pistemhat.get_temp',
                        default: 'get Temperature in [TEMP]',
                        description: 'get the Temperature'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TEMP: {
                            type: ArgumentType.STRING,
                            menu: 'TEMPs',
                            defaultValue: 'Celsius'
                        }
                    }
                },
                {
                    opcode: 'get_humidity',
                    text: formatMessage({
                        id: 'pistemhat.get_humidity',
                        default: 'get Humidity',
                        description: 'get the Humidity'
                    }),
                    blockType: BlockType.REPORTER
                    
                },
                {
                    opcode: 'get_ultrasonic',
                    text: formatMessage({
                        id: 'pistemhat.get_ultrasonic',
                        default: 'get Ultrasonic Distance in CM',
                        description: 'get Ultrasonic Distance in CM'
                    }),
                    blockType: BlockType.REPORTER
                    
                }
            ],
            menus: {
                LEDs: {
                    acceptReporters: true,
                    items: ['0', '1']
                },
                STATEs: {
                    acceptReporters: true,
                    items: ['ON', 'OFF']
                },
                MOTORs: {
                    acceptReporters: false,
                    items: ['Left Motor', 'Right Motor', 'Both Motors']
                },
                SERVOs: {
                    acceptReporters: false,
                    items: ['1', '2', '3', '4']
                },
                ROWs:
                {
                    acceptReporters: true,
                    items: ['1', '2', '3', '4']
                },
                ROWDELs:
                {
                    acceptReporters: false,
                    items: ['1', '2', '3', '4','All']
                },
                BUTTONs: {
                    acceptReporters: false,
                    items: ['5', '6']
                },
                ANALOGs: {
                    acceptReporters: false,
                    items: ['AN0', 'AN1', 'Light Sensor', 'Vin Voltage']
                },
                TEMPs:{
                    acceptReporters: false,
                    items: ['Celsius', 'Fahrenheit']
                }
            }
        };
    }


    when_buttonPressed(args) {
        const pin = Cast.toNumber(args.BUTTON);
        const state = gpio.get(pin, -1, -1); // Get state of pin, leave pin as input/output, leave pull state
        let binary = 0;
        return state == binary
    }
    // Set LED color
    set_LED(args) {
        const colour = Cast.toRgbColorList(args.COLOUR);
        var register1 = 0x00;
        var register2 = 0x00;
        var register3 = 0x00;
        if (args.LED === '0') {
            register1 = 0x09;
            register2 = 0x0A;
            register3 = 0x0B;

        } else if (args.LED === '1') {
            register1 = 0x0C;
            register2 = 0x0D;
            register3 = 0x0E;
        }
        i2c.writeToRegister(device, register1, colour[0]);
        i2c.writeToRegister(device, register2, colour[1]);
        i2c.writeToRegister(device, register3, colour[2]);
    }

    set_BUZZER(args) {
        let drive = 0;
        if (Cast.toString(args.STATE) == "ON")
            drive = 1;

        gpio.set(19, drive);
    }

    stop_MOTOR(args) {
        var M1A = 0x05;
        var M1B = 0x06;
        var M2A = 0x07;
        var M2B = 0x08;

        if (Cast.toString(args.MOTOR) == "Left Motor") {
            i2c.writeToRegister(device, M1A, 0);
            i2c.writeToRegister(device, M1B, 0);
        }
        else if (Cast.toString(args.MOTOR) == "Right Motor") {
            i2c.writeToRegister(device, M2A, 0);
            i2c.writeToRegister(device, M2B, 0);
        }
        else if (Cast.toString(args.MOTOR) == "Both Motors") {
            i2c.writeToRegister(device, M1A, 0);
            i2c.writeToRegister(device, M1B, 0);
            i2c.writeToRegister(device, M2A, 0);
            i2c.writeToRegister(device, M2B, 0);
        }

    }

    set_MOTOR(args) {
        var M1A = 0x05;
        var M1B = 0x06;
        var M2A = 0x07;
        var M2B = 0x08;
        var MotorSpeed = Cast.toNumber(args.POWER);

        if (MotorSpeed > 100) { MotorSpeed = 100 }
        else if (MotorSpeed < -100) { MotorSpeed = -100 }

        if (MotorSpeed > 0) {
            var MotorSpeed1 = MotorSpeed
            if (Cast.toString(args.MOTOR) == "Left Motor") {
                i2c.writeToRegister(device, M1A, scaleTo255(MotorSpeed1));
                i2c.writeToRegister(device, M1B, 0);

            }
            else if (Cast.toString(args.MOTOR) == "Right Motor") {
                i2c.writeToRegister(device, M2A, scaleTo255(MotorSpeed1));
                i2c.writeToRegister(device, M2B, 0);
            }
            else if (Cast.toString(args.MOTOR) == "Both Motors") {
                i2c.writeToRegister(device, M1A, scaleTo255(MotorSpeed1));
                i2c.writeToRegister(device, M1B, 0);
                i2c.writeToRegister(device, M2A, scaleTo255(MotorSpeed1));
                i2c.writeToRegister(device, M2B, 0);
            }
        }
        else if (MotorSpeed < 0) {
            var MotorSpeed1 = MotorSpeed * -1
            if (Cast.toString(args.MOTOR) == "Left Motor") {
                i2c.writeToRegister(device, M1A, 0);
                i2c.writeToRegister(device, M1B, scaleTo255(MotorSpeed1));
 
            }
            else if (Cast.toString(args.MOTOR) == "Right Motor") {
                i2c.writeToRegister(device, M2A, 0);
                i2c.writeToRegister(device, M2B, scaleTo255(MotorSpeed1));
            }
            else if (Cast.toString(args.MOTOR) == "Both Motors") {
                i2c.writeToRegister(device, M1A, 0);
                i2c.writeToRegister(device, M1B, scaleTo255(MotorSpeed1));
                i2c.writeToRegister(device, M2A, 0);
                i2c.writeToRegister(device, M2B, scaleTo255(MotorSpeed1));
            }
        }
        else {
            i2c.writeToRegister(device, M1A, 0);  //works // left motor forward
            i2c.writeToRegister(device, M1B, 0);  //doesnt works // mosfet burned
            i2c.writeToRegister(device, M2A, 0);  //works //right motor forward
            i2c.writeToRegister(device, M2B, 0);  //works //right motor backwars
        }
    }

    set_MOTOR_EACH(args)
    {
        var M1A = 0x05;
        var M1B = 0x06;
        var M2A = 0x07;
        var M2B = 0x08;
        var MotorSpeed1 = Cast.toNumber(args.POWERM1);
        var MotorSpeed2 = Cast.toNumber(args.POWERM2);

        if (MotorSpeed1 > 100) { MotorSpeed1 = 100 }
        else if (MotorSpeed1 < -100) { MotorSpeed1 = -100 }

        if (MotorSpeed2 > 100) { MotorSpeed2 = 100 }
        else if (MotorSpeed2 < -100) { MotorSpeed2 = -100 }

        if (MotorSpeed1 > 0) {
            i2c.writeToRegister(device, M1A, scaleTo255(MotorSpeed1));
            i2c.writeToRegister(device, M1B, 0);
        }
        else if (MotorSpeed1 < 0) {     
            MotorSpeed1 = MotorSpeed1 * -1
            i2c.writeToRegister(device, M1A, 0);
            i2c.writeToRegister(device, M1B, scaleTo255(MotorSpeed1));
        }
        else {
            i2c.writeToRegister(device, M1A, 0);  //works // left motor forward
            i2c.writeToRegister(device, M1B, 0);  //doesnt works // mosfet burned
        }


        if (MotorSpeed2 > 0) {
                i2c.writeToRegister(device, M2A, scaleTo255(MotorSpeed2));
                i2c.writeToRegister(device, M2B, 0);
        }
        else if (MotorSpeed2 < 0) {
                MotorSpeed2 = MotorSpeed2 * -1
                i2c.writeToRegister(device, M2A, 0);
                i2c.writeToRegister(device, M2B, scaleTo255(MotorSpeed2));
        }
        else {
            i2c.writeToRegister(device, M2A, 0);  //works //right motor forward
            i2c.writeToRegister(device, M2B, 0);  //works //right motor backwars
        }
    }

    set_SERVO(args) {
        var Servo1 = 0x01;
        var Servo2 = 0x02;
        var Servo3 = 0x03;
        var Servo4 = 0x04;

        var degree = Cast.toNumber(args.DEGREE);
        if (degree > 180) { degree = 180 }
        else if (degree < 0) { degree = 0 }

        if (Cast.toString(args.SERVO) == "1") {
            i2c.writeToRegister(device, Servo1, degree);
        }
        if (Cast.toString(args.SERVO) == "2") {
            i2c.writeToRegister(device, Servo2, degree);
        }
        if (Cast.toString(args.SERVO) == "3") {
            i2c.writeToRegister(device, Servo3, degree);
        }
        if (Cast.toString(args.SERVO) == "4") {
            i2c.writeToRegister(device, Servo4, degree);
        }

    }
    set_OLED(args)
    {
        AddText(Cast.toString(args.TEXT),Cast.toNumber(args.ROW))
        delay(10)
    }
    reset_OLED(args)
    {
        if (Cast.toString(args.ROWDEL) == "1") {
            ClearOLED(1)
        }
        if (Cast.toString(args.ROWDEL) == "2") {
            ClearOLED(2)
        }
        if (Cast.toString(args.ROWDEL) == "3") {
            ClearOLED(3)
        }
        if (Cast.toString(args.ROWDEL) == "4") {
            ClearOLED(4)
        }
        if (Cast.toString(args.ROWDEL) == "All") {
            ClearOLED(5)
        }
    }

    get_button(args) {
        const pin = Cast.toNumber(args.BUTTON);
        const state = gpio.get(pin, -1, -1); // Get state of pin, leave pin as input/output, leave pull state
        let binary = 0;
        return state == binary
    }

    get_gpio (args)
    {
        const pin = Cast.toNumber (args.GPIO);
        const val = Cast.toString (args.HILO);
        const state = gpio.get(pin,-1,-1); // Get state of pin, leave pin as input/output, leave pull state
        let binary = 0;

        if(val == 'high') 
            binary = 1

        return state == binary
    }

    get_analog(args) {
        var register = 0x00;

        if (Cast.toString(args.ANALOG) == "AN0") {
            register = 0x0F;
        }
        if (Cast.toString(args.ANALOG) == "AN1") {
            register = 0x10;
        }
        if (Cast.toString(args.ANALOG) == "Light Sensor") {
            register = 0x11;
        }
        if (Cast.toString(args.ANALOG) == "Vin Voltage") {
            register = 0x12;
        }


        let readings = [];

        // Collect 5 readings
        for (let i = 0; i < 5; i++) {
            let value = i2c.readFromRegister(device, register);
            readings.push(value);
        }

        // Filter out anomalies (values > 5)
        let validReadings = readings.filter(value => value <= 70);

        
        return validReadings[0];

    }

    async get_temp(args)
    {
        if (Cast.toString(args.TEMP) == "Celsius") {
            return readAHT20(0);
        }
        if (Cast.toString(args.TEMP) == "Fahrenheit") {
            return readAHT20(1)
        }
    }
    
    async get_humidity(args)
    {
            return readAHT20(2);  
    }

    get_ultrasonic(args) 
    {
        const currentTime = Date.now();
        if (currentTime - lastReadTime > 100) {
            var temp = gpio.readUltrasonic(20, 26);
            if(temp != -1)
            {
                cachedUltrasonicValue = temp
            }
            lastReadTime = currentTime;
        }
        return cachedUltrasonicValue;
    }
    
}

module.exports = Scratch3PiSTEMHATBlocks;
