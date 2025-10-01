---
title: Warp
date: 2025-09-28
category: rev
organizer: SunshineCTF.org
difficulty: medium
tags:
  - ctf
  - medium
  - rev
  - sun2025
  - sunshine
---
Ci viene fornito un file binario `warp` dal peso di 17.6 MB (questo è importante ma vedremo dopo)

```bash
$ ./warp               
Error: MapError(CreateError { name: "rb", code: -1, io_error: Os { code: 1, kind: PermissionDenied, message: "Operation not permitted" } })

$ sudo '/mnt/c/Users/etamb/Desktop/CTF/Sunshine 25/rev/warp' 
[sudo] password for kali: 
This proram is listening...
```

Avviandolo per la prima volta, abbiamo notato che il processo ha provato a creare una **BPF map** chiamata `rb` (*ringbuf*).

In breve: **eBPF** (o anche **BPF**) non è altro che un mini-VM nel kernel Linux che permette di caricare piccoli programmi che eseguono in kernel-space.

Di per se quindi, il file binario non è un unico file standalone, ma carica "piccoli programmi" nel kernel (ecco dal peso).

Facendolo eseguire con i permessi di root, il programma resta in ascolto.
Da li iniziamo ad ispezionare le mappe

```bash
$ sudo bpftool map show
11: hash_of_maps  name cgroup_hash  flags 0x0
        key 8B  value 4B  max_entries 2048  memlock 168064B
15: array  name .rodata  flags 0x80
        key 4B  value 46B  max_entries 1  memlock 312B
        frozen
16: ringbuf  name rb  flags 0x0
        key 0B  value 0B  max_entries 4096  memlock 16680B
```

Prendiamo in considerazione l'id `15` poiché contiene un blob di dati statici su `.rodata`
Eseguiamo il dump

```bash
$ sudo bpftool map dump id 15 > map15.raw

$ cat map15.raw
key:
00 00 00 00
value:
57 34 72 70 00 00 00 00  00 00 00 00 00 00 00 00
24 26 5f 2c 5f 3f 5f 50  58 21 00 50 11 41 15 50
54 20 55 56 50 58 3f 50  53 23 23 23 23 2e
Found 1 element
```

I primi 4 byte, letti in little-endianess, in ASCII è `W4rp`, successivamente una serie di padding `00` mentre i restanti 30 byte potrebbe trattarsi della flag encodata.

Il prossimo passo è capire come viene decodata la flag.

Eseguiamo `binwalk`

```bash
$ binwalk warp                                                                               
DECIMAL       HEXADECIMAL     DESCRIPTION
--------------------------------------------------------------------------------
0             0x0             ELF, 64-bit LSB shared object, AMD x86-64, version 1 (SYSV)
107129        0x1A279         ESP Image (ESP32): segment count: 11, flash mode: QUIO, flash speed: 40MHz, flash size: 1MB, entry address: 0xb8000000, hash: none
1404835       0x156FA3        ESP Image (ESP32): segment count: 7, flash mode: DOUT, flash speed: 40MHz, flash size: 1MB, entry address: 0xbc8d4800, hash: none
1933198       0x1D7F8E        ESP Image (ESP32): segment count: 3, flash mode: DIO, flash speed: 40MHz, flash size: 1MB, entry address: 0xfe894800, hash: none
1986560       0x1E5000        ELF, 64-bit LSB relocatable, version 1 (SYSV)
1992901       0x1E68C5        Unix path: /home/brosu/Documents/CTF/sunshine/warp-ebpf/src/w-ebpf
1994854       0x1E7066        Unix path: /home/brosu/Documents/CTF/sunshine/warp-ebpf/src/w-ebpf/main.bpf.c
1999743       0x1E837F        Unix path: /home/brosu/Documents/CTF/sunshine/warp-ebpf/src/w-ebpf
2017565       0x1EC91D        Unix path: /sys/fs/bpf is of type  which is currently unsupported in Aya, use `allow_unsupported_maps()` to load it anyways
...
```

Tra gli indirizzi che ci interessa prendiamo `0x1E5000` che è l'entry del programma.
Estraiamo ora in formato `.o`

```bash
┌──(kali㉿kali)-[~/ctf/sunshinectf25/rev]
└─$ dd if=./warp of=prog_bpf.o bs=1 skip=$((0x1E5000)) count=$((1024*200)) status=none 
                                                                                                                                         
┌──(kali㉿kali)-[~/ctf/sunshinectf25/rev]
└─$ file prog_bpf.o 
prog_bpf.o: ELF 64-bit LSB relocatable, eBPF, version 1 (SYSV), with debug_info, not stripped
                                                                                                                                         
┌──(kali㉿kali)-[~/ctf/sunshinectf25/rev]
└─$ readelf -hS prog_bpf.o | sed -n '1,120p'
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              REL (Relocatable file)
  Machine:                           Linux BPF
  Version:                           0x1
  Entry point address:               0x0
  Start of program headers:          0 (bytes into file)
  Start of section headers:          19168 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           0 (bytes)
  Number of program headers:         0
  Size of section headers:           64 (bytes)
  Number of section headers:         28
  Section header string table index: 1

Section Headers:
  [Nr] Name              Type             Address           Offset
       Size              EntSize          Flags  Link  Info  Align
  [ 0]                   NULL             0000000000000000  00000000
       0000000000000000  0000000000000000           0     0     0
  [ 1] .strtab           STRTAB           0000000000000000  000049c8
       0000000000000118  0000000000000000           0     0     1
  [ 2] .text             PROGBITS         0000000000000000  00000040
       0000000000000000  0000000000000000  AX       0     0     4
  [ 3] xdp               PROGBITS         0000000000000000  00000040
       0000000000000cc0  0000000000000000  AX       0     0     8
  [ 4] .relxdp           REL              0000000000000000  000035d8
       0000000000000020  0000000000000010   I      27     3     8
  [ 5] .rodata           PROGBITS         0000000000000000  00000d00
       000000000000002e  0000000000000000   A       0     0     16
  [ 6] .maps             PROGBITS         0000000000000000  00000d30
       0000000000000010  0000000000000000  WA       0     0     8
  [ 7] license           PROGBITS         0000000000000000  00000d40
       000000000000000c  0000000000000000  WA       0     0     1
  [ 8] .debug_loclists   PROGBITS         0000000000000000  00000d4c
       00000000000001f3  0000000000000000           0     0     1
  [ 9] .debug_abbrev     PROGBITS         0000000000000000  00000f3f
       000000000000020e  0000000000000000           0     0     1
  [10] .debug_info       PROGBITS         0000000000000000  0000114d
       0000000000000536  0000000000000000           0     0     1
  [11] .rel.debug_info   REL              0000000000000000  000035f8
       0000000000000060  0000000000000010   I      27    10     8
  [12] .debug_rnglists   PROGBITS         0000000000000000  00001683
       000000000000002a  0000000000000000           0     0     1
  [13] .debug_str_o[...] PROGBITS         0000000000000000  000016ad
       00000000000001f8  0000000000000000           0     0     1
  [14] .rel.debug_s[...] REL              0000000000000000  00003658
       00000000000007c0  0000000000000010   I      27    13     8
  [15] .debug_str        PROGBITS         0000000000000000  000018a5
       00000000000004a3  0000000000000001  MS       0     0     1
  [16] .debug_addr       PROGBITS         0000000000000000  00001d48
       0000000000000048  0000000000000000           0     0     1
  [17] .rel.debug_addr   REL              0000000000000000  00003e18
       0000000000000080  0000000000000010   I      27    16     8
  [18] .BTF              PROGBITS         0000000000000000  00001d90
       00000000000007e1  0000000000000000           0     0     4
  [19] .rel.BTF          REL              0000000000000000  00003e98
       0000000000000040  0000000000000010   I      27    18     8
  [20] .BTF.ext          PROGBITS         0000000000000000  00002574
       0000000000000a90  0000000000000000           0     0     4
  [21] .rel.BTF.ext      REL              0000000000000000  00003ed8
       0000000000000a60  0000000000000010   I      27    20     8
  [22] .debug_frame      PROGBITS         0000000000000000  00003008
       0000000000000028  0000000000000000           0     0     8
  [23] .rel.debug_frame  REL              0000000000000000  00004938
       0000000000000020  0000000000000010   I      27    22     8
  [24] .debug_line       PROGBITS         0000000000000000  00003030
       000000000000034f  0000000000000000           0     0     1
  [25] .rel.debug_line   REL              0000000000000000  00004958
       0000000000000070  0000000000000010   I      27    24     8
  [26] .debug_line_str   PROGBITS         0000000000000000  0000337f
       00000000000000a6  0000000000000001  MS       0     0     1
  [27] .symtab           SYMTAB           0000000000000000  00003428
       00000000000001b0  0000000000000018           1    15     8
```

E generiamo il disassembly del file `.o`

```bash
$ llvm-objdump --disassemble --no-show-raw-insn --arch-name=bpf prog_bpf.o > bpf_asm.txt

$ sed -n '1,300p' bpf.asm.txt

prog_bpf.o:     file format elf64-bpf

Disassembly of section xdp:

0000000000000000 <xdp_prog>:
       0:       r7 = *(u32 *)(r1 + 0x4)
       1:       r1 = *(u32 *)(r1 + 0x0)
       2:       r6 = r1
       3:       r6 += 0xe
       4:       if r6 > r7 goto +0x191 <xdp_prog+0xcb0>
       5:       r2 = r1
       6:       r2 += 0x22
       7:       if r2 > r7 goto +0x18e <xdp_prog+0xcb0>
       8:       r2 = *(u16 *)(r1 + 0xc)
       9:       if r2 != 0x8 goto +0x18c <xdp_prog+0xcb0>
      10:       r2 = *(u8 *)(r6 + 0x0)
      11:       r2 <<= 0x2
      12:       r2 &= 0x3c
      13:       r3 = 0x14
      14:       if r3 > r2 goto +0x187 <xdp_prog+0xcb0>
      15:       r1 = *(u8 *)(r1 + 0x17)
      16:       if r1 == 0x6 goto +0x4 <xdp_prog+0xa8>
      17:       if r1 != 0x11 goto +0x184 <xdp_prog+0xcb0>
      18:       r6 += r2
      19:       r6 += 0x8
      20:       goto +0xa <xdp_prog+0xf8>
      21:       r6 += r2
      22:       r1 = r6
      23:       r1 += 0x14
      24:       if r1 > r7 goto +0x17d <xdp_prog+0xcb0>
      25:       r1 = *(u16 *)(r6 + 0xc)
      26:       r1 >>= 0x2
      27:       r1 &= 0x3c
      28:       r6 += r1
      29:       r2 = 0x14
      30:       if r2 > r1 goto +0x177 <xdp_prog+0xcb0>
      31:       r8 = r6
      32:       r8 += 0x4
      33:       if r8 > r7 goto +0x174 <xdp_prog+0xcb0>
      34:       r1 = *(u8 *)(r6 + 0x1)
      35:       r1 <<= 0x8
      36:       r2 = *(u8 *)(r6 + 0x0)
      37:       r1 |= r2
      38:       r2 = *(u8 *)(r6 + 0x2)
      39:       r2 <<= 0x10
      40:       r3 = *(u8 *)(r6 + 0x3)
      41:       r3 <<= 0x18
      42:       r3 |= r2
      43:       r3 |= r1
      44:       if r3 != 0x70723457 goto +0x169 <xdp_prog+0xcb0>
      45:       r1 = 0x0 ll
      47:       r2 = 0x21
      48:       r3 = 0x0
      49:       call 0x83
      50:       if r0 == 0x0 goto +0x163 <xdp_prog+0xcb0>
      51:       if r8 >= r7 goto +0x9c <xdp_prog+0x680>
      52:       r1 = *(u8 *)(r6 + 0x4)
      53:       *(u8 *)(r0 + 0x0) = r1
      54:       r1 = r6
      55:       r1 += 0x5
      56:       if r1 >= r7 goto +0x97 <xdp_prog+0x680>
      57:       r1 = *(u8 *)(r6 + 0x5)
      58:       *(u8 *)(r0 + 0x1) = r1
      59:       r1 = r6
      60:       r1 += 0x6
      61:       if r1 >= r7 goto +0x92 <xdp_prog+0x680>
      62:       r1 = *(u8 *)(r6 + 0x6)
      63:       *(u8 *)(r0 + 0x2) = r1
      64:       r1 = r6
      65:       r1 += 0x7
      66:       if r1 >= r7 goto +0x8d <xdp_prog+0x680>
      67:       r1 = *(u8 *)(r6 + 0x7)
      68:       *(u8 *)(r0 + 0x3) = r1
      69:       r1 = r6
      70:       r1 += 0x8
      71:       if r1 >= r7 goto +0x88 <xdp_prog+0x680>
      72:       r1 = *(u8 *)(r6 + 0x8)
      73:       *(u8 *)(r0 + 0x4) = r1
      74:       r1 = r6
      75:       r1 += 0x9
      76:       if r1 >= r7 goto +0x83 <xdp_prog+0x680>
      77:       r1 = *(u8 *)(r6 + 0x9)
      78:       *(u8 *)(r0 + 0x5) = r1
      79:       r1 = r6
      80:       r1 += 0xa
      81:       if r1 >= r7 goto +0x7e <xdp_prog+0x680>
      82:       r1 = *(u8 *)(r6 + 0xa)
      83:       *(u8 *)(r0 + 0x6) = r1
      84:       r1 = r6
      85:       r1 += 0xb
      86:       if r1 >= r7 goto +0x79 <xdp_prog+0x680>
      87:       r1 = *(u8 *)(r6 + 0xb)
      88:       *(u8 *)(r0 + 0x7) = r1
      89:       r1 = r6
      90:       r1 += 0xc
      91:       if r1 >= r7 goto +0x74 <xdp_prog+0x680>
      92:       r1 = *(u8 *)(r6 + 0xc)
      93:       *(u8 *)(r0 + 0x8) = r1
      94:       r1 = r6
      95:       r1 += 0xd
      96:       if r1 >= r7 goto +0x6f <xdp_prog+0x680>
      97:       r1 = *(u8 *)(r6 + 0xd)
      98:       *(u8 *)(r0 + 0x9) = r1
      99:       r1 = r6
     100:       r1 += 0xe
     101:       if r1 >= r7 goto +0x6a <xdp_prog+0x680>
     102:       r1 = *(u8 *)(r6 + 0xe)
     103:       *(u8 *)(r0 + 0xa) = r1
     104:       r1 = r6
     105:       r1 += 0xf
     106:       if r1 >= r7 goto +0x65 <xdp_prog+0x680>
     107:       r1 = *(u8 *)(r6 + 0xf)
     108:       *(u8 *)(r0 + 0xb) = r1
     109:       r1 = r6
     110:       r1 += 0x10
     111:       if r1 >= r7 goto +0x60 <xdp_prog+0x680>
     112:       r1 = *(u8 *)(r6 + 0x10)
     113:       *(u8 *)(r0 + 0xc) = r1
     114:       r1 = r6
     115:       r1 += 0x11
     116:       if r1 >= r7 goto +0x5b <xdp_prog+0x680>
     117:       r1 = *(u8 *)(r6 + 0x11)
     118:       *(u8 *)(r0 + 0xd) = r1
     119:       r1 = r6
     120:       r1 += 0x12
     121:       if r1 >= r7 goto +0x56 <xdp_prog+0x680>
     122:       r1 = *(u8 *)(r6 + 0x12)
     123:       *(u8 *)(r0 + 0xe) = r1
     124:       r1 = r6
     125:       r1 += 0x13
     126:       if r1 >= r7 goto +0x51 <xdp_prog+0x680>
     127:       r1 = *(u8 *)(r6 + 0x13)
     128:       *(u8 *)(r0 + 0xf) = r1
     129:       r1 = r6
     130:       r1 += 0x14
     131:       if r1 >= r7 goto +0x4c <xdp_prog+0x680>
     132:       r1 = *(u8 *)(r6 + 0x14)
     133:       *(u8 *)(r0 + 0x10) = r1
     134:       r1 = r6
     135:       r1 += 0x15
     136:       if r1 >= r7 goto +0x47 <xdp_prog+0x680>
     137:       r1 = *(u8 *)(r6 + 0x15)
     138:       *(u8 *)(r0 + 0x11) = r1
     139:       r1 = r6
     140:       r1 += 0x16
     141:       if r1 >= r7 goto +0x42 <xdp_prog+0x680>
     142:       r1 = *(u8 *)(r6 + 0x16)
     143:       *(u8 *)(r0 + 0x12) = r1
     144:       r1 = r6
     145:       r1 += 0x17
     146:       if r1 >= r7 goto +0x3d <xdp_prog+0x680>
     147:       r1 = *(u8 *)(r6 + 0x17)
     148:       *(u8 *)(r0 + 0x13) = r1
     149:       r1 = r6
     150:       r1 += 0x18
     151:       if r1 >= r7 goto +0x38 <xdp_prog+0x680>
     152:       r1 = *(u8 *)(r6 + 0x18)
     153:       *(u8 *)(r0 + 0x14) = r1
     154:       r1 = r6
     155:       r1 += 0x19
     156:       if r1 >= r7 goto +0x33 <xdp_prog+0x680>
     157:       r1 = *(u8 *)(r6 + 0x19)
     158:       *(u8 *)(r0 + 0x15) = r1
     159:       r1 = r6
     160:       r1 += 0x1a
     161:       if r1 >= r7 goto +0x2e <xdp_prog+0x680>
     162:       r1 = *(u8 *)(r6 + 0x1a)
     163:       *(u8 *)(r0 + 0x16) = r1
     164:       r1 = r6
     165:       r1 += 0x1b
     166:       if r1 >= r7 goto +0x29 <xdp_prog+0x680>
     167:       r1 = *(u8 *)(r6 + 0x1b)
     168:       *(u8 *)(r0 + 0x17) = r1
     169:       r1 = r6
     170:       r1 += 0x1c
     171:       if r1 >= r7 goto +0x24 <xdp_prog+0x680>
     172:       r1 = *(u8 *)(r6 + 0x1c)
     173:       *(u8 *)(r0 + 0x18) = r1
     174:       r1 = r6
     175:       r1 += 0x1d
     176:       if r1 >= r7 goto +0x1f <xdp_prog+0x680>
     177:       r1 = *(u8 *)(r6 + 0x1d)
     178:       *(u8 *)(r0 + 0x19) = r1
     179:       r1 = r6
     180:       r1 += 0x1e
     181:       if r1 >= r7 goto +0x1a <xdp_prog+0x680>
     182:       r1 = *(u8 *)(r6 + 0x1e)
     183:       *(u8 *)(r0 + 0x1a) = r1
     184:       r1 = r6
     185:       r1 += 0x1f
     186:       if r1 >= r7 goto +0x15 <xdp_prog+0x680>
     187:       r1 = *(u8 *)(r6 + 0x1f)
     188:       *(u8 *)(r0 + 0x1b) = r1
     189:       r1 = r6
     190:       r1 += 0x20
     191:       if r1 >= r7 goto +0x10 <xdp_prog+0x680>
     192:       r1 = *(u8 *)(r6 + 0x20)
     193:       *(u8 *)(r0 + 0x1c) = r1
     194:       r1 = r6
     195:       r1 += 0x21
     196:       if r1 >= r7 goto +0xb <xdp_prog+0x680>
     197:       r1 = *(u8 *)(r6 + 0x21)
     198:       *(u8 *)(r0 + 0x1d) = r1
     199:       r1 = r6
     200:       r1 += 0x22
     201:       if r1 >= r7 goto +0x6 <xdp_prog+0x680>
     202:       r1 = *(u8 *)(r6 + 0x22)
     203:       *(u8 *)(r0 + 0x1e) = r1
     204:       r6 += 0x23
     205:       if r6 >= r7 goto +0x2 <xdp_prog+0x680>
     206:       r1 = *(u8 *)(r6 + 0x0)
     207:       *(u8 *)(r0 + 0x1f) = r1
     208:       r1 = 0x0
     209:       r2 = 0x21
     210:       goto +0x33 <xdp_prog+0x830>
     211:       r3 += r1
     212:       *(u8 *)(r3 + 0x0) = r4
     213:       r1 += 0x1
     214:       if r1 != 0x1e goto +0x2f <xdp_prog+0x830>
     215:       r2 = *(u8 *)(r10 - 0x1c)
     216:       r2 <<= 0x8
     217:       r1 = *(u8 *)(r10 - 0x1d)
     218:       r2 |= r1
     219:       r3 = *(u8 *)(r10 - 0x1b)
     220:       r3 <<= 0x10
     221:       r1 = *(u8 *)(r10 - 0x1a)
     222:       r1 <<= 0x18
     223:       r1 |= r3
     224:       r4 = *(u8 *)(r10 - 0x20)
     225:       r4 <<= 0x8
     226:       r3 = *(u8 *)(r10 - 0x21)
     227:       r4 |= r3
     228:       r5 = *(u8 *)(r10 - 0x1f)
     229:       r5 <<= 0x10
     230:       r3 = *(u8 *)(r10 - 0x1e)
     231:       r3 <<= 0x18
     232:       r3 |= r5
     233:       r3 |= r4
     234:       r1 |= r2
     235:       r4 = *(u8 *)(r0 + 0x1)
     236:       r4 <<= 0x8
     237:       r2 = *(u8 *)(r0 + 0x0)
     238:       r4 |= r2
     239:       r5 = *(u8 *)(r0 + 0x2)
     240:       r5 <<= 0x10
     241:       r2 = *(u8 *)(r0 + 0x3)
     242:       r2 <<= 0x18
     243:       r2 |= r5
     244:       r1 <<= 0x20
     245:       r1 |= r3
     246:       r2 |= r4
     247:       r3 = *(u8 *)(r0 + 0x5)
     248:       r3 <<= 0x8
     249:       r4 = *(u8 *)(r0 + 0x4)
     250:       r3 |= r4
     251:       r4 = *(u8 *)(r0 + 0x6)
     252:       r4 <<= 0x10
     253:       r5 = *(u8 *)(r0 + 0x7)
     254:       r5 <<= 0x18
     255:       r5 |= r4
     256:       r5 |= r3
     257:       r5 <<= 0x20
     258:       r5 |= r2
     259:       if r5 == r1 goto +0x12 <xdp_prog+0x8b0>
     260:       r1 = 0x1
     261:       goto +0x89 <xdp_prog+0xc78>
     262:       r3 = r10
     263:       r3 += -0x21
     264:       r4 = 0x10 ll
     266:       r4 += r1
     267:       r4 = *(u8 *)(r4 + 0x0)
     268:       r4 ^= 0x60
     269:       r4 <<= 0x38
     270:       r4 s>>= 0x38
     271:       if r2 s> r4 goto -0x3d <xdp_prog+0x698>
     272:       r4 += 0xe
     273:       r4 <<= 0x20
     274:       r4 >>= 0x20
     275:       r4 %= 0x5e
     276:       r4 += 0x21
     277:       goto -0x43 <xdp_prog+0x698>
     278:       r2 = *(u8 *)(r10 - 0x14)
     279:       r2 <<= 0x8
     280:       r1 = *(u8 *)(r10 - 0x15)
     281:       r2 |= r1
     282:       r3 = *(u8 *)(r10 - 0x13)
     283:       r3 <<= 0x10
     284:       r1 = *(u8 *)(r10 - 0x12)
     285:       r1 <<= 0x18
     286:       r1 |= r3
     287:       r4 = *(u8 *)(r10 - 0x18)
     288:       r4 <<= 0x8
     289:       r3 = *(u8 *)(r10 - 0x19)
     290:       r4 |= r3
     291:       r5 = *(u8 *)(r10 - 0x17)
     292:       r5 <<= 0x10
     293:       r3 = *(u8 *)(r10 - 0x16)
     294:       r3 <<= 0x18
     295:       r3 |= r5
```

Da qui in poi l'analisi diventa un po' difficile se non si ha dimestichezza, quindi quello che possiamo fare è fornire il disassemblato al vostro LLM di fiducia (nel mio caso ChatGPT) e lui vi dirà come avviene la decodifica e vi genera anche lo script in python se fornite il blob di dati che abbiamo trovato.

> Nel disassembly della sezione `xdp` abbiamo identificato il punto d’interesse cercando il _magic_ `W4rp` (32-bit little-endian check 0x70723457):

```
...
43:  r3 |= r1
44:  if r3 != 0x70723457 goto +0x169
...
```

> Questa condizione seleziona il payload corrispondente e introduce la routine che costruisce il buffer di output. Subito dopo troviamo letture di byte e poi il vero loop di trasformazione (le righe rilevanti sono intorno a `262..277` nel tuo dump):

```
262:  r3 = r10
263:  r3 += -0x21
264:  r4 = 0x10 ll
266:  r4 += r1
267:  r4 = *(u8 *)(r4 + 0x0)     # load byte input
268:  r4 ^= 0x60                 # xor 0x60
269:  r4 <<= 0x38                # shift left 56
270:  r4 s>>= 0x38               # arithmetic right shift 56 => SIGN-EXTEND 8->64
271:  if r2 s> r4 goto -0x3d
272:  r4 += 0xe                  # +0x0E
273:  r4 <<= 0x20
274:  r4 >>= 0x20                # normalize to low 32 bits
275:  r4 %= 0x5e                 # modulo 0x5E
276:  r4 += 0x21                 # +0x21 => printable ASCII range
277:  goto -0x43                 # loop
```

> Queste istruzioni sono il decoder: prendono ogni byte del blob, applicano XOR, sign-extend, add, modulo e infine lo mappano in un carattere stampabile, scrivendolo poi nel buffer (nel resto del codice si vede la scrittura `*(u8 *)(r0 + k) = rX`).
> Ogni riga tradotta in operazione semantica:
	- `r4 = *(u8 *)(...)` → prendi un singolo byte `b` dall’input blob.
    - `r4 ^= 0x60` → `x = b ^ 0x60`. 
	- `r4 <<= 0x38` e `r4 s>>= 0x38` → left shift 56 e arithmetic right shift 56: tecnica BPF per **sign-extend** l’8-bit risultante in un valore con segno (8→64 bit). Equivalentemente: se `x & 0x80` allora `sx = x - 0x100` altrimenti `sx = x`.
    - `r4 += 0x0e` → `sx = sx + 14`.
    - `r4 <<= 0x20; r4 >>= 0x20` → normalizza/truncate al range a 32 bit (implementazione interna dovuta a come BPF gestisce risultati intermedi).
    - `r4 %= 0x5e` → `y = (sx + 0x0E) mod 94`.
    - `r4 += 0x21` → `ch = y + 33` → garantisce che il risultato cada nell’intervallo `0x21..0x7E` (caratteri ASCII stampabili).
    - Infine il valore `ch` viene scritto nel buffer di output (`*(u8 *)(out + idx) = ch`).

Lo script di decodifica quindi è:

```python
from typing import List

# bytes estratti dalla tua mappa .rodata (46 bytes)
data = [
0x57,0x34,0x72,0x70,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
0x24,0x26,0x5f,0x2c,0x5f,0x3f,0x5f,0x50,0x58,0x21,0x00,0x50,0x11,0x41,0x15,0x50,
0x54,0x20,0x55,0x56,0x50,0x58,0x3f,0x50,0x53,0x23,0x23,0x23,0x23,0x2e
]

def sign_extend8(x: int) -> int:
    if x & 0x80:
        return x - 0x100
    return x

def decode_byte(b: int) -> int:
    x = b ^ 0x60
    x = sign_extend8(x)
    x = (x + 0x0E) % 0x5E
    ch = x + 0x21
    return ch

payload = data[16:]

decoded = ''.join(chr(decode_byte(b)) for b in payload)
print("decoded:", decoded)
```

```bash
$ python3 solve.py

decoded: sun{n0n_gp1_BPF_code_g0_brrrr}
```

Flag: `sun{n0n_gp1_BPF_code_g0_brrrr}`