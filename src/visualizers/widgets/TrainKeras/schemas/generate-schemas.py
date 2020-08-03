import tensorflow as tf
from tensorflow import keras
import inspect
import json

def is_class_name(n, skip_names=[]):
    return n[0].isupper() and n not in skip_names

def parse_schema(mod_name, module, name):
    class_ = getattr(module, name)
    spec = inspect.getfullargspec(class_)
    ctor_args = spec.args[1:]
    kw_arg_start_index = len(ctor_args)-len(spec.defaults)
    kw_args = list(zip(ctor_args[kw_arg_start_index:], spec.defaults))
    pos_args = list(zip(ctor_args[0:kw_arg_start_index]))
    args = [ (name, None) for name in pos_args ]
    args.extend(kw_args)
    return {
        'name': name,
        #'docstring': inspect.getdoc(class_),
        'arguments': [ {'name': n, 'default': d} for (n, d) in args ],
        #'url': f'https://keras.io/api/{mod_name}/{name.lower()}/'
    }

def parse_module_schemas(module, skip_names=[]):
    mod_name = module.__name__.split('.')[-1]
    mod_names = ( n for n in dir(module) if is_class_name(n, skip_names) )
    class_names = ( n for n in mod_names if True )  # type(getattr(module, n)) is type)
    schemas = ( parse_schema(mod_name, module, n) for n in class_names )
    return [ schema for schema in schemas if schema is not None ]

all_schemas = {}
all_schemas['optimizers'] = parse_module_schemas(keras.optimizers, ['Optimizer'])
all_schemas['losses'] = parse_module_schemas(keras.losses, ['Loss', 'Reduction', 'KLD', 'MAE', 'MAPE', 'MSE', 'MSLE'])

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
