# rpkclust/detectors/checksum.py

ChecksumDetector: `name="checksum"`, `lengths=(1,2,4)`.
Auxiliary: calc_xor8, calc_sum8, calc_crc8 (poly 0x07), calc_crc16_modbus (poly 0xA001 LSB-first init 0xFFFF), calc_crc16_ccitt (poly 0x1021 MSB-first init 0xFFFF), calc_crc16_dnp (poly 0xA6BC final XOR), calc_crc32 (zlib).
`check()`: per k, select algorithm list. If offset>0, test data range m.data[:offset] against stored expected value from each slice; for k=1 also try xor8/sum8/crc8 over both endians; k=2: crc16-modbus/ccitt/dnp over little/big; k=4: crc32 only. Return Hit with info: algo name, range [0:offset], endian. D-20 documented: D in Eq. 6 undefined → V2 uses prefix before checksum field as default range.