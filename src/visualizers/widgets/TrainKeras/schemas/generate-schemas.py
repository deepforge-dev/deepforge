import inspect
import json

from tensorflow import keras


def is_class_name(n, skip_names=None):
    if skip_names is None:
        skip_names = []
    return n[0].isupper() and n not in skip_names


def parse_schema(mod_name, module, name):
    class_ = getattr(module, name)
    spec = inspect.getfullargspec(class_.__init__)
    ctor_args = spec.args[1:]
    kw_arg_start_index = -1
    if spec.defaults is not None:
        kw_arg_start_index = len(ctor_args)-len(spec.defaults)
    kw_args = list(zip(ctor_args[kw_arg_start_index:], spec.defaults if spec.defaults is not None else []))
    pos_args = list(zip(ctor_args[0:kw_arg_start_index]))
    args = [ (name, None) for name in pos_args ]
    args.extend(kw_args)

    return {
        'name': name,
        #'docstring': inspect.getdoc(class_),
        'arguments': [ {'name': n if isinstance(n, str) else n[0], 'default': d} for (n, d) in args ],
        #'url': f'https://keras.io/api/{mod_name}/{name.lower()}/'
    }


def parse_module_schemas(module, skip_names=None):
    if skip_names is None:
        skip_names = []

    mod_name = module.__name__.split('.')[-1]
    mod_names = ( n for n in dir(module) if is_class_name(n, skip_names) )
    class_names = ( n for n in mod_names if True )  # type(getattr(module, n)) is type)
    schemas = ( parse_schema(mod_name, module, n) for n in class_names )
    return [ schema for schema in schemas if schema is not None ]


all_schemas = {}
all_schemas['optimizers'] = parse_module_schemas(keras.optimizers, ['Optimizer'])
all_schemas['losses'] = parse_module_schemas(keras.losses, ['Loss', 'Reduction', 'KLD', 'MAE', 'MAPE', 'MSE', 'MSLE'])
all_schemas['reductions'] = [ getattr(keras.losses.Reduction, name) for name in dir(keras.losses.Reduction) if name[0].isupper() ]
all_schemas['callbacks'] = parse_module_schemas(keras.callbacks, ['BaseLogger', 'Callback', 'History', 'CallbackList', 'ProgbarLogger'])


def is_regression(loss_name):
    other_losses = ['CosineSimilarity', 'LogCosh', 'Huber']
    return 'Error' in loss_name or loss_name in other_losses


def add_loss_category(loss):
    if 'Hinge' in loss['name']:
        category = 'Hinge'
    elif is_regression(loss['name']):
        category = 'Regression'
    else:
        category = 'Probabilistic'

    loss['category'] = category + ' losses'


for loss in all_schemas['losses']:
    add_loss_category(loss)

print(json.dumps(all_schemas))
