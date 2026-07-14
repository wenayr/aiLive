# Laboratory run resource

This layer owns only canonical task/run data and legal state transitions. It does not know about React, Socket.IO, child processes or file paths. Those concerns enter through coordination and bindings above this resource.

Read the contracts and state transform before loading any executor or web binding.
