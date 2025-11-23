# Project Documentation: ChatPerMedia

## 1. Project Title
**ChatPerMedia: Secure Communication & Forensic Media Tracking System**

## 2. Team Details
| Name | Roll Number |
|------|-------------|
| [Name 1] | [Roll No 1] |
| [Name 2] | [Roll No 2] |
| [Name 3] | [Roll No 3] |
| [Name 4] | [Roll No 4] |

## 3. Abstract
ChatPerMedia is a security-centric communication platform developed to enforce **Confidentiality**, **Integrity**, and **Accountability** in digital exchanges. The project addresses the vulnerability of standard messaging channels to interception and the rampant issue of unauthorized media leakage. By implementing **End-to-End Encryption (E2EE)** using **Elliptic Curve Diffie-Hellman (ECDH)** and **AES-GCM**, the system ensures that message payloads remain opaque to all intermediaries, including the server. To counter data exfiltration, the platform employs **Digital Steganography**. Specifically, it utilizes **Least Significant Bit (LSB)** embedding to insert invisible, forensic watermarks (Media IDs) into images and videos. This allows for the post-incident attribution of leaked content to its source, thereby establishing a chain of custody and non-repudiation for shared media.

## 4. Problem Statement
In the domain of Information Security, two primary threat vectors compromise secure communication:
1.  **Man-in-the-Middle (MitM) & Eavesdropping**: Traditional client-server architectures often decrypt messages at the server level, creating a single point of failure where attackers or malicious insiders can harvest sensitive data.
2.  **Insider Threats & Data Leaks**: Even with secure transport, authorized recipients can easily copy and disseminate sensitive media (images/videos) without detection. There is a lack of effective mechanisms to trace the provenance of such leaked files back to the specific transaction or user who leaked them.

This project aims to mitigate these threats by combining robust cryptographic primitives for data-in-transit protection with steganographic techniques for data-at-rest/usage accountability.

## 5. Introduction
Modern information security requires a defense-in-depth approach. ChatPerMedia demonstrates this by layering multiple security controls:
*   **Transport Layer Security**: While HTTPS protects the tunnel, application-layer E2EE ensures that the server itself is "blind" to the message content.
*   **Content Security**: Steganography transforms media files into "smart" assets that carry their own history.

The application functions as a secure chat interface where users perform a cryptographic handshake (key exchange) upon connection. Text messages are encrypted locally on the client device. Media files undergo a transformation process where a unique identifier is embedded into the pixel data before delivery. This ensures that if a file is leaked to a public forum, the embedded ID can be extracted to identify the original sender and intended recipient.

## 6. IS Lab Topics Utilized
This project practically implements core Information Security concepts covered in the curriculum:
*   **Symmetric Encryption**: **AES-256-GCM** (Galois/Counter Mode) is used for message confidentiality and integrity. GCM mode provides authenticated encryption, preventing ciphertext tampering.
*   **Asymmetric Cryptography**: **ECDH (Elliptic Curve Diffie-Hellman)** using the **NIST P-256** curve is employed for secure key establishment over an insecure channel.
*   **Steganography**: **LSB (Least Significant Bit)** substitution is used to hide forensic payloads within multimedia carriers (Images and Video Frames) without perceptible perceptual degradation.
*   **Key Management**: Generation, export, and import of cryptographic keys using the **Web Crypto API**.

## 7. Security Architecture & Design

### 7.1 Threat Model
*   **Attacker Capabilities**:
    *   Can intercept all network traffic (Passive sniffing).
    *   Can access the database (Server compromise).
*   **Security Guarantees**:
    *   **Confidentiality**: An attacker cannot read messages without the private keys, which never leave the client devices.
    *   **Traceability**: An attacker cannot remove the watermark from leaked media without significantly degrading the quality (robustness against simple cropping/compression).

### 7.2 System Components
1.  **Client (React + Web Crypto API)**:
    *   **Key Generation**: Generates ephemeral ECDH key pairs.
    *   **Encryption Engine**: Encrypts messages `AES-GCM(Message, SharedSecret)` before sending.
    *   **Decryption Engine**: Decrypts incoming payloads using the derived session key.
2.  **Server (Node.js + Socket.IO)**:
    *   **Relay Node**: Passes encrypted blobs between clients.
    *   **Authentication**: Verifies user identity via JWT, but does *not* possess decryption keys.
3.  **Forensic Microservice (Python)**:
    *   **Watermarking Engine**: Receives raw media, embeds the `MediaID` + `RecipientHash` (conceptually), and returns the watermarked file.
    *   **Extraction Engine**: Analyzes suspicious files to recover the embedded ID.

## 8. Implementation Details

### 8.1 Cryptographic Handshake (ECDH)
The project uses the **Web Crypto API** (`window.crypto.subtle`) for high-performance, standards-compliant cryptography.
1.  **Key Gen**: `crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, ...)` produces a public/private key pair.
2.  **Exchange**: Public keys are serialized to JSON/Raw format and exchanged via Socket.IO.
3.  **Derivation**: `crypto.subtle.deriveBits` combines the User's Private Key and Peer's Public Key to generate a 256-bit Shared Secret.
    *   *Note*: This shared secret is identical for both parties but computationally infeasible for an observer to derive.

### 8.2 Message Encryption (AES-GCM)
*   **Algorithm**: AES-GCM (Galois/Counter Mode).
*   **IV (Initialization Vector)**: A unique 12-byte IV is generated for *every* message to prevent replay attacks and identical ciphertext patterns.
*   **Process**: `Ciphertext = Encrypt(Key=SharedSecret, IV=Random, Data=Message)`.
*   **Output**: The IV is prepended to the ciphertext (`IV:Ciphertext`) so the recipient can use it for decryption.

### 8.3 Steganography (LSB)
The Python microservice handles media processing to ensure robustness.
*   **Algorithm**: Least Significant Bit substitution.
*   **Payload**: `MediaID` (MongoDB ObjectId) + `|END|` delimiter.
*   **Encoding**:
    1.  Convert Payload to Binary (ASCII -> 8-bit binary).
    2.  Iterate through image pixels (or video frames).
    3.  Replace the last bit of the Red, Green, and Blue channels with payload bits.
    *   *Capacity*: 3 bits per pixel. A 1920x1080 image has ample space for metadata.
*   **Extraction**: The reverse process reads the LSBs until the `|END|` delimiter is found, recovering the ID to trace the leak.

## 9. References
1.  **NIST SP 800-56A**: Recommendation for Pair-Wise Key Establishment Schemes Using Discrete Logarithm Cryptography.
2.  **FIPS 197**: Advanced Encryption Standard (AES).
3.  **NIST SP 800-38D**: Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM).
4.  **Steganography Techniques**: *Provos, N., & Honeyman, P. (2003). Hide and Seek: An Introduction to Steganography. IEEE Security & Privacy.*
