Storage and Compute Adapters
============================
DeepForge is designed to integrate with existing computational and storage resources and is not intended to be a competitor to existing HPC or object storage frameworks.
This integration is made possible through the use of compute and storage adapters. This section provides a brief description of these adapters as well as currently supported integrations.

Storage Adapters
----------------
Projects in DeepForge may contain artifacts which reference datasets, trained model weights, or other associated binary data. Although the project code, pipelines, and models are stored in MongoDB, this associated data is stored using a storage adapter. Storage adapters enable DeepForge to store this associated data using an appropriate storage resource, such as a object store w/ an S3-compatible API.
This also enables users to "bring their own storage" as they can connect their existing cyberinfrastructure to a public deployment of DeepForge.
Currently, DeepForge supports 3 different storage adapters:

1. S3 Storage: Object storage with an S3-compatible API such as `minio <https://play.min.io>`_ or `AWS S3 <https://aws.amazon.com/s3/>`_
2. SciServer Files: Files service from `SciServer <https://sciserver.org>`_
3. WebGME Blob Storage: Blob storage provided by `WebGME <https://webgme.org/>`_

Compute Adapters
----------------
Similar to storage adapters, compute adapters enable DeepForge to integrate with existing cyberinfrastructure used for executing some computation or workflow. This is designed to allow users to leverage their existing HPC or other computational resources with DeepForge. Compute adapters provide an interface through which DeepForge is able to execute workflows (e.g., training a neural network) on external machines.

Currently, the following compute adapters are available:

1. WebGME Worker: A worker machine which polls for jobs via the `WebGME Executor Framework <https://github.com/webgme/webgme/wiki/GME-Executor-Framework>`_. Registered users can connect their own compute machines enabling them to use their personal desktops with DeepForge.
2. SciServer Compute: Compute service offered by `SciServer <https://sciserver.org>`_
3. Server Compute: Execute the job on the server machine. This is similar to the execution model used by Jupyter notebook servers.

